# Segurança

## RLS
Todas as tabelas sensíveis têm Row Level Security. Sem policy, nada é visível.

## Isolamento por tenant
- O tenant do usuário vem de `tenant_users` (servidor/banco), nunca só da URL.
- `can_access(tenant, modulo, permissao)` exige: membro ativo + módulo contratado + permissão.
- Teste obrigatório: `database/tests/tenant_isolation.sql`.

## service_role proibido no frontend
A chave `SERVICE_ROLE_KEY` ignora RLS. Só pode existir em variáveis de servidor e ser lida dentro de funções de servidor. Nunca com prefixo `VITE_`.

## Auditoria
`tenant_audit_logs` recebe registros automáticos por trigger (`audit_row`) em toda criação, edição e exclusão. Somente o dono do tenant e super-admins leem.

## Storage por tenant
Bucket privado `tenant-files`; todo arquivo em `<tenant_id>/<modulo>/arquivo`. A policy valida a primeira pasta contra `tenant_users`.

## Variáveis de ambiente
| Variável | Onde | Pública? |
|---|---|---|
| VITE_SUPABASE_URL | navegador | sim |
| VITE_SUPABASE_PUBLISHABLE_KEY (anon) | navegador | sim |
| SUPABASE_URL | servidor | não |
| SUPABASE_SERVICE_ROLE_KEY | servidor | **não — segredo** |
