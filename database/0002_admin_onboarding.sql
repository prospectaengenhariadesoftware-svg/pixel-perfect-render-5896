-- Engenharia SaaS Modular — administração da plataforma e cadastro de empresas
-- Rodar DEPOIS de 0001_base_multitenant.sql, no SQL Editor do Supabase.

-- updated_at automático
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger tenants_touch before update on public.tenants
  for each row execute function public.touch_updated_at();
create trigger rh_employees_touch before update on public.rh_employees
  for each row execute function public.touch_updated_at();

-- Super-admin gerencia empresas e módulos
create policy "admin gerencia tenants" on public.tenants for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "admin gerencia modulos" on public.tenant_modules for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "admin gerencia assinaturas" on public.tenant_subscriptions for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "admin gerencia vinculos" on public.tenant_users for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());
grant insert, update, delete on public.tenants, public.tenant_modules, public.tenant_subscriptions to authenticated;

-- Cadastro de empresa com dono (só super-admin ou SQL Editor)
create or replace function public.create_tenant(_name text, _slug text, _owner_email text, _modules text[] default '{}')
returns uuid language plpgsql security definer set search_path = public as $$
declare _tenant uuid; _owner uuid; _m text;
begin
  if auth.uid() is not null and not public.is_platform_admin() then
    raise exception 'Apenas administradores da plataforma';
  end if;
  select id into _owner from auth.users where lower(email) = lower(_owner_email);
  if _owner is null then raise exception 'Usuário % não existe em Authentication', _owner_email; end if;
  insert into tenants (name, slug) values (_name, _slug) returning id into _tenant;
  insert into tenant_users (tenant_id, user_id, is_owner) values (_tenant, _owner, true);
  insert into tenant_settings (tenant_id) values (_tenant);
  foreach _m in array _modules loop
    insert into tenant_modules (tenant_id, module_key) values (_tenant, _m);
  end loop;
  return _tenant;
end $$;

-- Liberar / bloquear módulo
create or replace function public.set_tenant_module(_tenant uuid, _module text, _enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_platform_admin() then
    raise exception 'Apenas administradores da plataforma';
  end if;
  insert into tenant_modules (tenant_id, module_key, enabled) values (_tenant, _module, _enabled)
  on conflict (tenant_id, module_key) do update set enabled = excluded.enabled, enabled_at = now();
  insert into tenant_audit_logs (tenant_id, user_id, module_key, action, entity, entity_id)
  values (_tenant, auth.uid(), _module, case when _enabled then 'MODULE_ON' else 'MODULE_OFF' end, 'tenant_modules', _module);
end $$;

revoke all on function public.create_tenant(text,text,text,text[]) from public, anon;
revoke all on function public.set_tenant_module(uuid,text,boolean) from public, anon;
grant execute on function public.create_tenant(text,text,text,text[]) to authenticated, service_role;
grant execute on function public.set_tenant_module(uuid,text,boolean) to authenticated, service_role;
