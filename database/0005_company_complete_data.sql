-- Engenharia SaaS Modular — dados completos de empresa no Super Admin
-- Rodar depois de 0004_super_admin_actions.sql.

create table if not exists public.tenant_owner_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  function_title text not null default 'Proprietário',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_owner_contacts_name_len check (char_length(trim(name)) between 2 and 160),
  constraint tenant_owner_contacts_phone_len check (phone is null or char_length(phone) <= 32),
  constraint tenant_owner_contacts_email_format check (email is null or email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint tenant_owner_contacts_function_len check (char_length(trim(function_title)) between 2 and 80)
);

grant select, insert, update, delete on public.tenant_owner_contacts to authenticated;
grant all on public.tenant_owner_contacts to service_role;
alter table public.tenant_owner_contacts enable row level security;

drop policy if exists "owner contacts le" on public.tenant_owner_contacts;
create policy "owner contacts le" on public.tenant_owner_contacts for select to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_platform_admin());

drop policy if exists "owner contacts admin gerencia" on public.tenant_owner_contacts;
create policy "owner contacts admin gerencia" on public.tenant_owner_contacts for all to authenticated
  using (public.is_tenant_owner(tenant_id) or public.is_platform_admin())
  with check (public.is_tenant_owner(tenant_id) or public.is_platform_admin());

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
set search_path = public, pg_temp
as $$
declare
  _tenant uuid;
  _owner uuid;
  _m text;
  _normalized_slug text;
  _owner_contact jsonb;
begin
  if auth.uid() is not null and not public.is_platform_admin() then
    raise exception 'Apenas administradores da plataforma';
  end if;

  _normalized_slug := lower(trim(_slug));

  if nullif(trim(_name), '') is null then
    raise exception 'Nome da empresa é obrigatório';
  end if;

  if _normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Slug inválido. Use letras minúsculas, números e hífen.';
  end if;

  select id into _owner
  from auth.users
  where lower(email) = lower(trim(_owner_email))
  limit 1;

  if _owner is null then
    raise exception 'Usuário % não existe em Authentication', _owner_email;
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
    jsonb_build_object('name', trim(_name), 'slug', _normalized_slug, 'owner_email', lower(trim(_owner_email)), 'modules', coalesce(_modules, '{}'), 'company_data', coalesce(_company_data, '{}'::jsonb))
  );

  return _tenant;
end;
$$;

revoke all on function public.create_tenant(text, text, text, text[], jsonb) from public, anon;
grant execute on function public.create_tenant(text, text, text, text[], jsonb) to authenticated, service_role;

create or replace function public.platform_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Apenas administradores da plataforma';
  end if;

  return jsonb_build_object(
    'stats', jsonb_build_object(
      'tenants_total', (select count(*) from public.tenants),
      'tenants_active', (select count(*) from public.tenants where status = 'ativo'),
      'users_total', (select count(*) from public.tenant_users where status = 'ativo'),
      'platform_admins_total', (select count(*) from public.platform_admins),
      'modules_total', (select count(*) from public.subscription_modules)
    ),
    'modules', coalesce((
      select jsonb_agg(jsonb_build_object('key', sm.key, 'name', sm.name, 'monthly_price', sm.monthly_price, 'is_core', sm.is_core) order by sm.is_core desc, sm.key)
      from public.subscription_modules sm
    ), '[]'::jsonb),
    'tenants', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'slug', t.slug,
          'status', t.status,
          'created_at', t.created_at,
          'updated_at', t.updated_at,
          'company_data', coalesce(ts.settings, '{}'::jsonb),
          'owner_contacts', coalesce((
            select jsonb_agg(jsonb_build_object('id', toc.id, 'name', toc.name, 'phone', toc.phone, 'email', toc.email, 'function', toc.function_title) order by toc.name)
            from public.tenant_owner_contacts toc
            where toc.tenant_id = t.id
          ), '[]'::jsonb),
          'users', coalesce((
            select jsonb_agg(jsonb_build_object('id', tu.id, 'user_id', tu.user_id, 'email', au.email, 'is_owner', tu.is_owner, 'status', tu.status, 'created_at', tu.created_at) order by tu.is_owner desc, au.email nulls last, tu.created_at)
            from public.tenant_users tu
            left join auth.users au on au.id = tu.user_id
            where tu.tenant_id = t.id
          ), '[]'::jsonb),
          'modules', coalesce((
            select jsonb_agg(jsonb_build_object('key', sm.key, 'name', sm.name, 'monthly_price', sm.monthly_price, 'is_core', sm.is_core, 'enabled', coalesce(tm.enabled, sm.is_core), 'enabled_at', tm.enabled_at) order by sm.is_core desc, sm.key)
            from public.subscription_modules sm
            left join public.tenant_modules tm on tm.tenant_id = t.id and tm.module_key = sm.key
          ), '[]'::jsonb),
          'audit_logs', coalesce((
            select jsonb_agg(row_to_json(x) order by x.created_at desc)
            from (select al.id, al.created_at, al.module_key, al.action, al.entity, al.entity_id, al.details from public.tenant_audit_logs al where al.tenant_id = t.id order by al.created_at desc limit 8) x
          ), '[]'::jsonb)
        ) order by t.created_at desc, t.name
      )
      from public.tenants t
      left join public.tenant_settings ts on ts.tenant_id = t.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.platform_admin_overview() from public, anon;
grant execute on function public.platform_admin_overview() to authenticated, service_role;
