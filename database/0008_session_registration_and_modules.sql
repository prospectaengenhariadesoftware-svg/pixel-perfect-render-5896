-- Engenharia SaaS Modular — cadastro público por sessão autenticada + módulos escolhidos
-- Corrige o login do auto cadastro: o usuário é criado pelo GoTrue/Supabase Auth
-- via signUp no cliente, e esta função apenas cria o tenant vinculado ao auth.uid().

create or replace function public.register_company_from_session(
  _name text,
  _slug text,
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
  _owner_email text;
  _m text;
  _normalized_slug text;
  _owner_contact jsonb;
begin
  _owner := auth.uid();

  if _owner is null then
    raise exception 'Sessão autenticada obrigatória para concluir o cadastro';
  end if;

  select lower(trim(email)) into _owner_email
  from auth.users
  where id = _owner
  limit 1;

  if nullif(_owner_email, '') is null then
    raise exception 'Usuário autenticado sem e-mail válido';
  end if;

  if exists (
    select 1
    from public.tenant_users tu
    where tu.user_id = _owner
      and tu.status = 'ativo'
  ) then
    raise exception 'Este e-mail já está vinculado a uma empresa.';
  end if;

  _normalized_slug := lower(trim(_slug));

  if nullif(trim(_name), '') is null then
    raise exception 'Nome da empresa é obrigatório';
  end if;

  if _normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Slug inválido. Use letras minúsculas, números e hífen.';
  end if;

  if exists (select 1 from public.tenants where slug = _normalized_slug) then
    raise exception 'Este slug já está em uso. Escolha outro identificador.';
  end if;

  insert into public.tenants (name, slug, status)
  values (trim(_name), _normalized_slug, 'ativo')
  returning id into _tenant;

  insert into public.tenant_users (tenant_id, user_id, is_owner, status)
  values (_tenant, _owner, true, 'ativo')
  on conflict (tenant_id, user_id) do update
    set is_owner = true, status = 'ativo';

  insert into public.tenant_settings (tenant_id, settings)
  values (_tenant, (coalesce(_company_data, '{}'::jsonb) - 'owners') || jsonb_build_object('selectedModules', coalesce(_modules, '{}')))
  on conflict (tenant_id) do update
    set settings = coalesce(public.tenant_settings.settings, '{}'::jsonb)
      || (coalesce(_company_data, '{}'::jsonb) - 'owners')
      || jsonb_build_object('selectedModules', coalesce(_modules, '{}')),
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
    if not exists (select 1 from public.subscription_modules where key = _m and is_core = false) then
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
    _owner,
    'PUBLIC_TENANT_REGISTERED',
    'tenants',
    _tenant::text,
    jsonb_build_object(
      'name', trim(_name),
      'slug', _normalized_slug,
      'owner_email', _owner_email,
      'modules', coalesce(_modules, '{}'),
      'company_data', coalesce(_company_data, '{}'::jsonb)
    )
  );

  return _tenant;
end;
$$;

revoke all on function public.register_company_from_session(text, text, text[], jsonb) from public;
grant execute on function public.register_company_from_session(text, text, text[], jsonb) to authenticated, service_role;
