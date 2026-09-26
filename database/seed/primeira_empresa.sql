-- Cadastro da PRIMEIRA empresa (rodar no SQL Editor, como postgres).
-- Antes: crie o usuário em Authentication > Users (com senha) e troque os valores abaixo.

-- 1) Tornar você super-admin da plataforma
insert into public.platform_admins (user_id)
select id from auth.users where lower(email) = lower('SEU_EMAIL@dominio.com')
on conflict do nothing;

-- 2) Criar a empresa, vincular o dono e liberar módulos
select public.create_tenant(
  'NOME DA EMPRESA',
  'slug-da-empresa',
  'SEU_EMAIL@dominio.com',
  array['empresa','rh']   -- módulos liberados; opções: empresa, rh, suprimentos, obras, financeiro
);

-- Depois, para liberar/bloquear:
-- select public.set_tenant_module('<tenant_id>', 'obras', true);
