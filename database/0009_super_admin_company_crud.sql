-- Engenharia SaaS Modular — CRUD seguro de empresas no Super Admin
-- Rodar depois de 0008_session_registration_and_modules.sql.
-- Escopo: atualização de dados da empresa/tenant, responsáveis e exclusão segura por inativação.

create or replace function public.admin_update_tenant(
  _tenant uuid,
  _name text,
  _slug text,
  _status text,
  _company_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _normalized_slug text := lower(trim(coalesce(_slug, '')));
  _normalized_status text := lower(trim(coalesce(_status, '')));
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Apenas administradores da plataforma';
  end if;

  if not exists (select 1 from public.tenants where id = _tenant) then
    raise exception 'Empresa não encontrada';
  end if;

  if nullif(trim(coalesce(_name, '')), '') is null then
    raise exception 'Nome da empresa é obrigatório';
  end if;

  if _normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Slug inválido. Use letras minúsculas, números e hífen.';
  end if;

  if _normalized_status not in ('ativo', 'pendente', 'inativo', 'bloqueado') then
    raise exception 'Status inválido: %', _status;
  end if;

  update public.tenants
  set name = trim(_name),
      slug = _normalized_slug,
      status = _normalized_status,
      updated_at = now()
  where id = _tenant;

  insert into public.tenant_settings (tenant_id, settings)
  values (_tenant, coalesce(_company_data, '{}'::jsonb) - 'owners')
  on conflict (tenant_id) do update
    set settings = coalesce(public.tenant_settings.settings, '{}'::jsonb)
      || (coalesce(_company_data, '{}'::jsonb) - 'owners'),
        updated_at = now();

  insert into public.tenant_audit_logs (tenant_id, user_id, action, entity, entity_id, details)
  values (
    _tenant,
    auth.uid(),
    'TENANT_UPDATED',
    'tenants',
    _tenant::text,
    jsonb_build_object('name', trim(_name), 'slug', _normalized_slug, 'status', _normalized_status, 'company_data', coalesce(_company_data, '{}'::jsonb) - 'owners')
  );
end;
$$;

create or replace function public.admin_save_tenant_owner_contacts(
  _tenant uuid,
  _owners jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _owner jsonb;
  _count int := 0;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Apenas administradores da plataforma';
  end if;

  if not exists (select 1 from public.tenants where id = _tenant) then
    raise exception 'Empresa não encontrada';
  end if;

  if jsonb_typeof(coalesce(_owners, '[]'::jsonb)) <> 'array' then
    raise exception 'Responsáveis devem ser enviados como array';
  end if;

  delete from public.tenant_owner_contacts where tenant_id = _tenant;

  for _owner in select * from jsonb_array_elements(coalesce(_owners, '[]'::jsonb)) loop
    if nullif(trim(coalesce(_owner->>'name', '')), '') is not null then
      insert into public.tenant_owner_contacts (tenant_id, name, phone, email, function_title)
      values (
        _tenant,
        trim(_owner->>'name'),
        nullif(trim(coalesce(_owner->>'phone', '')), ''),
        nullif(lower(trim(coalesce(_owner->>'email', ''))), ''),
        coalesce(nullif(trim(coalesce(_owner->>'function', '')), ''), 'Proprietário')
      );
      _count := _count + 1;
    end if;
  end loop;

  insert into public.tenant_audit_logs (tenant_id, user_id, action, entity, entity_id, details)
  values (
    _tenant,
    auth.uid(),
    'TENANT_OWNER_CONTACTS_SAVED',
    'tenant_owner_contacts',
    _tenant::text,
    jsonb_build_object('owners_count', _count)
  );
end;
$$;

create or replace function public.admin_archive_tenant(_tenant uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _tenant_name text;
  _dependencies jsonb;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Apenas administradores da plataforma';
  end if;

  select name into _tenant_name from public.tenants where id = _tenant;
  if _tenant_name is null then
    raise exception 'Empresa não encontrada';
  end if;

  _dependencies := jsonb_build_object(
    'tenant_users', (select count(*) from public.tenant_users where tenant_id = _tenant),
    'tenant_modules', (select count(*) from public.tenant_modules where tenant_id = _tenant),
    'tenant_settings', (select count(*) from public.tenant_settings where tenant_id = _tenant),
    'tenant_owner_contacts', (select count(*) from public.tenant_owner_contacts where tenant_id = _tenant),
    'tenant_audit_logs', (select count(*) from public.tenant_audit_logs where tenant_id = _tenant)
  );

  update public.tenants
  set status = 'inativo', updated_at = now()
  where id = _tenant;

  insert into public.tenant_audit_logs (tenant_id, user_id, action, entity, entity_id, details)
  values (
    _tenant,
    auth.uid(),
    'TENANT_ARCHIVED_INSTEAD_OF_DELETED',
    'tenants',
    _tenant::text,
    jsonb_build_object('name', _tenant_name, 'dependencies', _dependencies, 'physical_delete', false)
  );

  return jsonb_build_object(
    'action', 'archived_not_deleted',
    'status', 'inativo',
    'reason', 'Empresa possui relacionamentos; exclusão física foi substituída por inativação segura.',
    'dependencies', _dependencies
  );
end;
$$;

revoke all on function public.admin_update_tenant(uuid, text, text, text, jsonb) from public, anon;
revoke all on function public.admin_save_tenant_owner_contacts(uuid, jsonb) from public, anon;
revoke all on function public.admin_archive_tenant(uuid) from public, anon;

grant execute on function public.admin_update_tenant(uuid, text, text, text, jsonb) to authenticated, service_role;
grant execute on function public.admin_save_tenant_owner_contacts(uuid, jsonb) to authenticated, service_role;
grant execute on function public.admin_archive_tenant(uuid) to authenticated, service_role;
