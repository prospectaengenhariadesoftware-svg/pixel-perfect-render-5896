-- Teste Tenant A / Tenant B (rodar no SQL Editor após criar 2 usuários em auth.users).
-- Substitua :user_a e :user_b pelos UUIDs reais.
begin;
insert into public.tenants (id, name, slug) values
  ('00000000-0000-0000-0000-00000000000a','Tenant A','tenant-a'),
  ('00000000-0000-0000-0000-00000000000b','Tenant B','tenant-b');
insert into public.tenant_users (tenant_id, user_id, is_owner) values
  ('00000000-0000-0000-0000-00000000000a', ':user_a', true),
  ('00000000-0000-0000-0000-00000000000b', ':user_b', true);
insert into public.tenant_modules values ('00000000-0000-0000-0000-00000000000a','rh',true,now());
insert into public.rh_employees (tenant_id, name) values ('00000000-0000-0000-0000-00000000000a','Colaborador A');

-- Como usuário B: deve retornar 0 linhas
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', ':user_b')::text, true);
select count(*) as deve_ser_zero from public.rh_employees;

-- Como usuário A: deve retornar 1
select set_config('request.jwt.claims', json_build_object('sub', ':user_a')::text, true);
select count(*) as deve_ser_um from public.rh_employees;
rollback;
