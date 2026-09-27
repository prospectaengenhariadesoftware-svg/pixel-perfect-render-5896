-- Engenharia SaaS Modular — painel Super Admin
-- Rodar DEPOIS de 0002_admin_onboarding.sql.
-- Expõe um resumo JSON seguro apenas para usuários em public.platform_admins.

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
      select jsonb_agg(
        jsonb_build_object(
          'key', sm.key,
          'name', sm.name,
          'monthly_price', sm.monthly_price,
          'is_core', sm.is_core
        ) order by sm.is_core desc, sm.key
      )
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
          'users', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', tu.id,
                'user_id', tu.user_id,
                'email', au.email,
                'is_owner', tu.is_owner,
                'status', tu.status,
                'created_at', tu.created_at
              ) order by tu.is_owner desc, au.email nulls last, tu.created_at
            )
            from public.tenant_users tu
            left join auth.users au on au.id = tu.user_id
            where tu.tenant_id = t.id
          ), '[]'::jsonb),
          'modules', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'key', sm.key,
                'name', sm.name,
                'monthly_price', sm.monthly_price,
                'is_core', sm.is_core,
                'enabled', coalesce(tm.enabled, sm.is_core),
                'enabled_at', tm.enabled_at
              ) order by sm.is_core desc, sm.key
            )
            from public.subscription_modules sm
            left join public.tenant_modules tm
              on tm.tenant_id = t.id and tm.module_key = sm.key
          ), '[]'::jsonb),
          'audit_logs', coalesce((
            select jsonb_agg(row_to_json(x) order by x.created_at desc)
            from (
              select al.id, al.created_at, al.module_key, al.action, al.entity, al.entity_id, al.details
              from public.tenant_audit_logs al
              where al.tenant_id = t.id
              order by al.created_at desc
              limit 8
            ) x
          ), '[]'::jsonb)
        ) order by t.created_at desc, t.name
      )
      from public.tenants t
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.platform_admin_overview() from public, anon;
grant execute on function public.platform_admin_overview() to authenticated, service_role;
