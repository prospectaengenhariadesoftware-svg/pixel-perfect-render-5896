# Ligar o Supabase (codexa) à Vercel

Status: **preparado, não testado com o Supabase real**.

## 1. Variáveis na Vercel (Settings > Environment Variables — Production e Preview)
| Nome | Valor | Tipo |
|---|---|---|
| VITE_SUPABASE_URL | https://supabase.codexa.api.br | pública |
| VITE_SUPABASE_PUBLISHABLE_KEY | chave **anon** (Supabase: Settings > API) | pública, protegida por RLS |

Hoje só essas duas são necessárias. `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_DB_URL` **não** devem ser cadastradas até existir função de servidor que as use; nunca com prefixo `VITE_`.
Depois de salvar: Deployments > Redeploy (variáveis `VITE_` entram no build).

## 2. Banco (SQL Editor, nesta ordem)
1. `database/0001_base_multitenant.sql`
2. `database/0002_admin_onboarding.sql`
3. `database/tests/tenant_isolation.sql` — conferir `resultado = esperado` em todas as linhas.
4. `database/seed/primeira_empresa.sql` — com seu e-mail e o nome real da empresa.

## 3. Authentication
- URL Configuration > Site URL: `https://engenharia-inteligente.vercel.app`
- Redirect URLs: `https://engenharia-inteligente.vercel.app/reset-password`
- SMTP configurado (sem ele o e-mail de recuperação não sai).
- Desativar cadastro público se só convidados devem entrar.

## 4. Checklist de teste real
- [ ] Login com o usuário da primeira empresa
- [ ] Nome da empresa aparece na topbar
- [ ] Módulo liberado abre; não liberado mostra bloqueio
- [ ] Recuperar senha: e-mail chega e /reset-password troca a senha
- [ ] Teste A/B com todos os resultados iguais ao esperado
