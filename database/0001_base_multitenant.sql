-- Engenharia SaaS Modular — base multi-tenant
-- Aplicar no Supabase self-hosted (https://supabase.codexa.api.br) pelo SQL Editor.
-- Ordem: tabelas -> GRANTs -> RLS -> policies.

create extension if not exists pgcrypto;

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid references public.tenant_roles(id) on delete set null,
  is_owner boolean not null default false,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table public.tenant_permissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role_id uuid not null references public.tenant_roles(id) on delete cascade,
  module_key text not null,
  can_read boolean not null default true,
  can_write boolean not null default false,
  can_delete boolean not null default false,
  unique (role_id, module_key)
);

create table public.tenant_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  role_id uuid references public.tenant_roles(id) on delete set null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.tenant_files (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_key text not null,
  storage_path text not null, -- sempre "<tenant_id>/<modulo>/..."
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.tenant_audit_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id),
  module_key text,
  action text not null,
  entity text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  monthly_price numeric(12,2) not null default 0,
  active boolean not null default true
);

create table public.subscription_modules (
  key text primary key,
  name text not null,
  monthly_price numeric(12,2) not null default 0,
  is_core boolean not null default false
);

create table public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id),
  status text not null default 'ativo',
  started_at timestamptz not null default now(),
  ends_at timestamptz
);

create table public.tenant_modules (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_key text not null references public.subscription_modules(key),
  enabled boolean not null default true,
  enabled_at timestamptz not null default now(),
  primary key (tenant_id, module_key)
);

insert into public.subscription_modules (key, name, monthly_price, is_core) values
  ('dashboard','Home / Dashboard',0,true),
  ('empresa','Empresa',149,false),
  ('rh','Recursos Humanos',349,false),
  ('suprimentos','Suprimentos',299,false),
  ('obras','Obras',399,false),
  ('financeiro','Financeiro',449,false);

-- Funções auxiliares (security definer evita recursão de RLS)
create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid())
$$;

create or replace function public.is_tenant_member(_tenant uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from tenant_users
    where tenant_id = _tenant and user_id = auth.uid() and status = 'ativo')
$$;

create or replace function public.is_tenant_owner(_tenant uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from tenant_users
    where tenant_id = _tenant and user_id = auth.uid() and is_owner and status = 'ativo')
$$;

create or replace function public.has_module(_tenant uuid, _module text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from subscription_modules where key = _module and is_core)
      or exists (select 1 from tenant_modules
        where tenant_id = _tenant and module_key = _module and enabled)
$$;

create or replace function public.can_access(_tenant uuid, _module text, _perm text default 'read')
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_tenant_member(_tenant) and public.has_module(_tenant, _module) and (
    public.is_tenant_owner(_tenant) or exists (
      select 1 from tenant_users tu
      join tenant_permissions p on p.role_id = tu.role_id and p.module_key = _module
      where tu.tenant_id = _tenant and tu.user_id = auth.uid()
        and case _perm when 'write' then p.can_write when 'delete' then p.can_delete else p.can_read end
    ))
$$;

-- GRANTs
grant select on public.subscription_modules, public.subscription_plans to anon, authenticated;
grant select on public.platform_admins, public.tenants, public.tenant_roles, public.tenant_users,
  public.tenant_permissions, public.tenant_invites, public.tenant_settings, public.tenant_files,
  public.tenant_audit_logs, public.tenant_subscriptions, public.tenant_modules to authenticated;
grant insert, update, delete on public.tenant_roles, public.tenant_users, public.tenant_permissions,
  public.tenant_invites, public.tenant_settings, public.tenant_files to authenticated;
grant insert on public.tenant_audit_logs to authenticated;
grant all on all tables in schema public to service_role;

-- RLS
alter table public.platform_admins enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_roles enable row level security;
alter table public.tenant_users enable row level security;
alter table public.tenant_permissions enable row level security;
alter table public.tenant_invites enable row level security;
alter table public.tenant_settings enable row level security;
alter table public.tenant_files enable row level security;
alter table public.tenant_audit_logs enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscription_modules enable row level security;
alter table public.tenant_subscriptions enable row level security;
alter table public.tenant_modules enable row level security;

create policy "catalogo publico" on public.subscription_modules for select using (true);
create policy "planos publicos" on public.subscription_plans for select using (active);
create policy "admin ve admins" on public.platform_admins for select to authenticated using (public.is_platform_admin());

create policy "membro ve tenant" on public.tenants for select to authenticated
  using (public.is_tenant_member(id) or public.is_platform_admin());

do $$ declare t text; begin
  foreach t in array array['tenant_roles','tenant_users','tenant_permissions','tenant_invites','tenant_settings'] loop
    execute format('create policy "membro le" on public.%I for select to authenticated using (public.is_tenant_member(tenant_id) or public.is_platform_admin())', t);
    execute format('create policy "dono gerencia" on public.%I for all to authenticated using (public.is_tenant_owner(tenant_id)) with check (public.is_tenant_owner(tenant_id))', t);
  end loop;
end $$;

create policy "membro ve assinatura" on public.tenant_subscriptions for select to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_platform_admin());
create policy "membro ve modulos" on public.tenant_modules for select to authenticated
  using (public.is_tenant_member(tenant_id) or public.is_platform_admin());
-- tenant_modules / tenant_subscriptions só mudam via servidor (service_role) após cobrança.

create policy "arquivos le" on public.tenant_files for select to authenticated
  using (public.can_access(tenant_id, module_key, 'read'));
create policy "arquivos escreve" on public.tenant_files for insert to authenticated
  with check (public.can_access(tenant_id, module_key, 'write') and created_by = auth.uid()
    and storage_path like tenant_id::text || '/%');

create policy "auditoria le" on public.tenant_audit_logs for select to authenticated
  using (public.is_tenant_owner(tenant_id) or public.is_platform_admin());
create policy "auditoria grava" on public.tenant_audit_logs for insert to authenticated
  with check (public.is_tenant_member(tenant_id) and user_id = auth.uid());

-- Storage separado por tenant
insert into storage.buckets (id, name, public) values ('tenant-files','tenant-files', false)
  on conflict (id) do nothing;
create policy "tenant le arquivos" on storage.objects for select to authenticated
  using (bucket_id = 'tenant-files' and public.is_tenant_member(((storage.foldername(name))[1])::uuid));
create policy "tenant envia arquivos" on storage.objects for insert to authenticated
  with check (bucket_id = 'tenant-files' and public.is_tenant_member(((storage.foldername(name))[1])::uuid));

-- Modelo para tabelas de negócio (exemplo: rh_employees)
create table public.rh_employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  position text,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz
);
grant select, insert, update, delete on public.rh_employees to authenticated;
grant all on public.rh_employees to service_role;
alter table public.rh_employees enable row level security;
create policy "rh le" on public.rh_employees for select to authenticated
  using (deleted_at is null and public.can_access(tenant_id, 'rh', 'read'));
create policy "rh cria" on public.rh_employees for insert to authenticated
  with check (public.can_access(tenant_id, 'rh', 'write') and created_by = auth.uid());
create policy "rh edita" on public.rh_employees for update to authenticated
  using (public.can_access(tenant_id, 'rh', 'write')) with check (public.can_access(tenant_id, 'rh', 'write'));
create policy "rh exclui" on public.rh_employees for delete to authenticated
  using (public.can_access(tenant_id, 'rh', 'delete'));

-- Auditoria automática
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into tenant_audit_logs (tenant_id, user_id, module_key, action, entity, entity_id)
  values (coalesce(new.tenant_id, old.tenant_id), auth.uid(), tg_argv[0], tg_op, tg_table_name,
          coalesce(new.id, old.id)::text);
  return coalesce(new, old);
end $$;
create trigger rh_employees_audit after insert or update or delete on public.rh_employees
  for each row execute function public.audit_row('rh');
