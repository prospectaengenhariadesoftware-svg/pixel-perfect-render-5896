-- Engenharia SaaS Modular — auto cadastro público de empresa + primeiro dono
-- Rodar depois de 0006_auto_create_auth_owner.sql.

create or replace function public.register_company(
  _owner_email text,
  _password text,
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
  _owner uuid;
  _normalized_email text;
  _tenant uuid;
begin
  _normalized_email := lower(trim(_owner_email));

  if nullif(_normalized_email, '') is null or _normalized_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Informe um e-mail válido para o primeiro acesso';
  end if;

  if coalesce(length(_password), 0) < 8 then
    raise exception 'A senha deve ter pelo menos 8 caracteres';
  end if;

  if exists (select 1 from auth.users where lower(email) = _normalized_email) then
    raise exception 'Este e-mail já possui cadastro. Use Entrar ou Recuperar senha.';
  end if;

  _owner := gen_random_uuid();

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000'::uuid,
    _owner,
    'authenticated',
    'authenticated',
    _normalized_email,
    crypt(_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('email_verified', true, 'created_by', 'public_company_registration'),
    now(),
    now(),
    false,
    false
  );

  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    created_at,
    updated_at,
    id
  ) values (
    _owner::text,
    _owner,
    jsonb_build_object('sub', _owner::text, 'email', _normalized_email, 'email_verified', true, 'phone_verified', false),
    'email',
    now(),
    now(),
    gen_random_uuid()
  );

  select public.create_tenant(_name, _slug, _normalized_email, coalesce(_modules, '{}'), coalesce(_company_data, '{}'::jsonb))
  into _tenant;

  return _tenant;
end;
$$;

revoke all on function public.register_company(text, text, text, text, text[], jsonb) from public;
grant execute on function public.register_company(text, text, text, text, text[], jsonb) to anon, authenticated, service_role;
