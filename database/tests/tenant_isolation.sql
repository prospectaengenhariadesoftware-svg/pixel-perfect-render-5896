-- Teste de isolamento Tenant A / Tenant B.
-- Antes: crie 2 usuários em Authentication (a@teste.com e b@teste.com). Tudo é desfeito no rollback.
begin;
create temp table _u as
  select (select id from auth.users where email = 'a@teste.com') a,
         (select id from auth.users where email = 'b@teste.com') b;
grant select on _u to authenticated;

insert into public.tenants (id, name, slug) values
  ('00000000-0000-0000-0000-00000000000a','Teste A','teste-a'),
  ('00000000-0000-0000-0000-00000000000b','Teste B','teste-b');
insert into public.tenant_users (tenant_id, user_id, is_owner)
  select '00000000-0000-0000-0000-00000000000a', a, true from _u union all
  select '00000000-0000-0000-0000-00000000000b', b, true from _u;
insert into public.tenant_modules (tenant_id, module_key) values ('00000000-0000-0000-0000-00000000000a','rh');
insert into public.rh_employees (tenant_id, name) values ('00000000-0000-0000-0000-00000000000a','Registro de teste A');

set local role authenticated;

-- Usuário B: esperado 0 / 0 / 1
select set_config('request.jwt.claims', json_build_object('sub', (select b from _u), 'role','authenticated')::text, true);
select 'B vê funcionários de A' teste, count(*) resultado, 0 esperado from public.rh_employees
union all select 'B vê tenant A', count(*), 0 from public.tenants where id = '00000000-0000-0000-0000-00000000000a'
union all select 'B vê só o próprio tenant', count(*), 1 from public.tenants;

-- Usuário A: esperado 1 / 1
select set_config('request.jwt.claims', json_build_object('sub', (select a from _u), 'role','authenticated')::text, true);
select 'A vê seus funcionários' teste, count(*) resultado, 1 esperado from public.rh_employees
union all select 'A vê só o próprio tenant', count(*), 1 from public.tenants;

rollback;
