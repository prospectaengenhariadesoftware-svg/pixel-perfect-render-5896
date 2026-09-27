-- Engenharia SaaS Modular — criação automática do usuário dono no Auth
-- Rodar depois de 0005_company_complete_data.sql.
-- Objetivo: ao cadastrar nova empresa no Super Admin, não exigir cadastro manual prévio em Authentication.

create or replace function public.create_tenant(
  _name text,
  _slug text,
  _owner_email text,
  _modules text[] default '{}',
  _company_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  _tenant uuid;
  _owner uuid;
  _m text;
  _normalized_slug text;
  _normalized_owner_email text;
  _owner_contact jsonb;
  _owner_was_created boolean := false;
begin
  if auth.uid() is not null and not public.is_platform_admin() then
    raise exception 'Apenas administradores da plataforma';
  end if;

  _normalized_slug := lower(trim(_slug));
  _normalized_owner_email := lower(trim(_owner_email));

  if nullif(trim(_name), '') is null then
    raise exception 'Nome da empresa é obrigatório';
  end if;

  if nullif(_normalized_owner_email, '') is null or _normalized_owner_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'E-mail do responsável é obrigatório e deve ser válido';
  end if;

  if _normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Slug inválido. Use letras minúsculas, números e hífen.';
  end if;

  select id into _owner
  from auth.users
  where lower(email) = _normalized_owner_email
  limit 1;

  if _owner is null then
    _owner := gen_random_uuid();
    _owner_was_created := true;

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000'::uuid,
      _owner,
      'authenticated',
      'authenticated',
      _normalized_owner_email,
      crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('email_verified', true, 'created_by', 'platform_admin_company_registration'),
      now(),
      now(),
      false,
      false
    );

    insert into auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      created_at,
      updated_at,
      id
    ) values (
      _owner::text,
      _owner,
      jsonb_build_object('sub', _owner::text, 'email', _normalized_owner_email, 'email_verified', true, 'phone_verified', false),
      'email',
      now(),
      now(),
      gen_random_uuid()
    );
  end if;

  insert into public.tenants (name, slug, status)
  values (trim(_name), _normalized_slug, 'ativo')
  returning id into _tenant;

  insert into public.tenant_users (tenant_id, user_id, is_owner, status)
  values (_tenant, _owner, true, 'ativo')
  on conflict (tenant_id, user_id) do update
    set is_owner = true, status = 'ativo';

  insert into public.tenant_settings (tenant_id, settings)
  values (_tenant, coalesce(_company_data, '{}'::jsonb) - 'owners')
  on conflict (tenant_id) do update
    set settings = coalesce(public.tenant_settings.settings, '{}'::jsonb) || (coalesce(_company_data, '{}'::jsonb) - 'owners'),
        updated_at = now();

  delete from public.tenant_owner_contacts where tenant_id = _tenant;
  for _owner_contact in select * from jsonb_array_elements(coalesce(_company_data->'owners', '[]'::jsonb)) loop
    if nullif(trim(coalesce(_owner_contact->>'name', '')), '') is not null then
      insert into public.tenant_owner_contacts (tenant_id, name, phone, email, function_title)
      values (
        _tenant,
        trim(_owner_contact->>'name'),
        nullif(trim(coalesce(_owner_contact->>'phone', '')), ''),
        nullif(lower(trim(coalesce(_owner_contact->>'email', ''))), ''),
        coalesce(nullif(trim(_owner_contact->>'function'), ''), 'Proprietário')
      );
    end if;
  end loop;

  insert into public.tenant_modules (tenant_id, module_key, enabled)
  select _tenant, sm.key, true
  from public.subscription_modules sm
  where sm.is_core = true
  on conflict (tenant_id, module_key) do update
    set enabled = true, enabled_at = now();

  foreach _m in array coalesce(_modules, '{}') loop
    if not exists (select 1 from public.subscription_modules where key = _m) then
      raise exception 'Módulo inválido: %', _m;
    end if;

    insert into public.tenant_modules (tenant_id, module_key, enabled)
    values (_tenant, _m, true)
    on conflict (tenant_id, module_key) do update
      set enabled = true, enabled_at = now();
  end loop;

  insert into public.tenant_audit_logs (tenant_id, user_id, action, entity, entity_id, details)
  values (
    _tenant,
    auth.uid(),
    'TENANT_CREATED',
    'tenants',
    _tenant::text,
    jsonb_build_object(
      'name', trim(_name),
      'slug', _normalized_slug,
      'owner_email', _normalized_owner_email,
      'owner_auth_user_created', _owner_was_created,
      'modules', coalesce(_modules, '{}'),
      'company_data', coalesce(_company_data, '{}'::jsonb)
    )
  );

  return _tenant;
end;
$$;

revoke all on function public.create_tenant(text, text, text, text[], jsonb) from public, anon;
grant execute on function public.create_tenant(text, text, text, text[], jsonb) to authenticated, service_role;
