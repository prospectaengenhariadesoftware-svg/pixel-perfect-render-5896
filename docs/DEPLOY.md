# Deploy

## Hospedagem
- **Padrão:** botão "Publicar" da Lovable (SSR incluso).
- **Vercel:** `vercel.json` já define o build com `NITRO_PRESET=vercel`. Importe o repositório do GitHub na Vercel e configure as variáveis abaixo. Validar o primeiro deploy antes de usar em produção.

## Variáveis de ambiente (ver `.env.example`)
| Variável | Onde | Pública? |
|---|---|---|
| VITE_SUPABASE_URL | navegador | sim |
| VITE_SUPABASE_PUBLISHABLE_KEY (anon) | navegador | sim (protegida por RLS) |
| SUPABASE_URL | servidor | não |
| SUPABASE_SERVICE_ROLE_KEY | servidor | **segredo** |
| SUPABASE_DB_URL | servidor | **segredo** |

Equivalência com o documento original (Next.js): `NEXT_PUBLIC_SUPABASE_URL` → `VITE_SUPABASE_URL`; `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `VITE_SUPABASE_PUBLISHABLE_KEY`; `NEXT_PUBLIC_APP_URL` não é necessária (usa-se `window.location.origin`).

## Supabase self-hosted
1. Studio em https://supabase.codexa.api.br → rodar `database/0001_base_multitenant.sql`.
2. Rodar `database/tests/tenant_isolation.sql`.
3. Auth → URL do site e redirecionamentos (incluir `/reset-password`) para preview e produção.
4. Criar o primeiro tenant, vincular o usuário em `tenant_users` e liberar módulos em `tenant_modules`.
5. Backup diário do Postgres.
