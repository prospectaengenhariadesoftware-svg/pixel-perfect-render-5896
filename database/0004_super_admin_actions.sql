-- Engenharia SaaS Modular — ações reais do Super Admin
-- Rodar DEPOIS de 0003_super_admin_overview.sql.

create or replace function public.create_tenant(
  _name text,
  _slug text,
  _owner_email text,
  _modules text[] default '{}'
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

  insert into public.tenant_settings (tenant_id)
  values (_tenant)
  on conflict (tenant_id) do nothing;

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
    jsonb_build_object('name', trim(_name), 'slug', _normalized_slug, 'owner_email', lower(trim(_owner_email)), 'modules', coalesce(_modules, '{}'))
  );

  return _tenant;
end;
$$;

create or replace function public.admin_update_tenant_status(_tenant uuid, _status text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _normalized_status text := lower(trim(_status));
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Apenas administradores da plataforma';
  end if;

  if _normalized_status not in ('ativo', 'pendente', 'inativo', 'bloqueado') then
    raise exception 'Status inválido: %', _status;
  end if;

  update public.tenants
  set status = _normalized_status, updated_at = now()
  where id = _tenant;

  if not found then
    raise exception 'Empresa não encontrada';
  end if;

  insert into public.tenant_audit_logs (tenant_id, user_id, action, entity, entity_id, details)
  values (_tenant, auth.uid(), 'TENANT_STATUS_UPDATED', 'tenants', _tenant::text, jsonb_build_object('status', _normalized_status));
end;
$$;

create or replace function public.admin_add_tenant_user(
  _tenant uuid,
  _email text,
  _is_owner boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _user uuid;
  _tenant_user uuid;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Apenas administradores da plataforma';
  end if;

  select id into _user
  from auth.users
  where lower(email) = lower(trim(_email))
  limit 1;

  if _user is null then
    raise exception 'Usuário % não existe em Authentication', _email;
  end if;

  insert into public.tenant_users (tenant_id, user_id, is_owner, status)
  values (_tenant, _user, coalesce(_is_owner, false), 'ativo')
  on conflict (tenant_id, user_id) do update
    set is_owner = excluded.is_owner, status = 'ativo'
  returning id into _tenant_user;

  insert into public.tenant_audit_logs (tenant_id, user_id, action, entity, entity_id, details)
  values (
    _tenant,
    auth.uid(),
    'TENANT_USER_ADDED',
    'tenant_users',
    _tenant_user::text,
    jsonb_build_object('email', lower(trim(_email)), 'is_owner', coalesce(_is_owner, false))
  );

  return _tenant_user;
end;
$$;

create or replace function public.admin_update_tenant_user_status(_tenant_user uuid, _status text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _tenant uuid;
  _normalized_status text := lower(trim(_status));
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Apenas administradores da plataforma';
  end if;

  if _normalized_status not in ('ativo', 'pendente', 'inativo', 'bloqueado') then
    raise exception 'Status inválido: %', _status;
  end if;

  update public.tenant_users
  set status = _normalized_status
  where id = _tenant_user
  returning tenant_id into _tenant;

  if _tenant is null then
    raise exception 'Vínculo de usuário não encontrado';
  end if;

  insert into public.tenant_audit_logs (tenant_id, user_id, action, entity, entity_id, details)
  values (_tenant, auth.uid(), 'TENANT_USER_STATUS_UPDATED', 'tenant_users', _tenant_user::text, jsonb_build_object('status', _normalized_status));
end;
$$;

revoke all on function public.create_tenant(text, text, text, text[]) from public, anon;
revoke all on function public.admin_update_tenant_status(uuid, text) from public, anon;
revoke all on function public.admin_add_tenant_user(uuid, text, boolean) from public, anon;
revoke all on function public.admin_update_tenant_user_status(uuid, text) from public, anon;

grant execute on function public.create_tenant(text, text, text, text[]) to authenticated, service_role;
grant execute on function public.admin_update_tenant_status(uuid, text) to authenticated, service_role;
grant execute on function public.admin_add_tenant_user(uuid, text, boolean) to authenticated, service_role;
grant execute on function public.admin_update_tenant_user_status(uuid, text) to authenticated, service_role;
