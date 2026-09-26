# Arquitetura

## Visão geral
SaaS B2B multi-tenant para empresas de engenharia. Cada empresa cliente é um **tenant** e contrata módulos separadamente.

```text
Navegador ──> App (TanStack Start / React 19, SSR + funções de servidor)
                 │
                 └──> Supabase self-hosted (VPS: supabase.codexa.api.br)
                        ├─ Auth (login)
                        ├─ Postgres com RLS (isolamento por tenant_id)
                        └─ Storage (bucket tenant-files, pasta por tenant)
```

## Stack
- **Framework:** TanStack Start (React 19 + Vite). O documento original citava Next.js; a plataforma de desenvolvimento usa TanStack Start, que oferece o mesmo: SSR, rotas por arquivo e funções de servidor (`createServerFn`) no lugar de API routes.
- **Hospedagem:** publicação pela Lovable (edge). Pode ser exportado ao GitHub; ver `DEPLOY.md` sobre Vercel.
- **Banco/Auth/Storage:** Supabase self-hosted próprio.

## Pastas
- `src/routes/` — páginas (ver `ROTAS.md`).
- `src/components/app/` — AppShell (layout em `routes/app.tsx`), Sidebar, Topbar, ModuleGate, ModuleWorkspace e `ui-kit.tsx` (PageHeader, StatCard, DataTable, FilterBar, StatusBadge, EmptyState, LoadingState, ConfirmDialog, FormModal, AuditTimeline).
- `src/lib/modules.ts` — catálogo de módulos e preços.
- `src/lib/tenant-context.tsx` — estado do tenant (hoje local/demonstração).
- `database/` — SQL do banco. `database/tests/` — teste Tenant A/B.

## Multi-tenant
1. Usuário faz login (Supabase Auth).
2. Servidor descobre os tenants do usuário via `tenant_users` — nunca pelo tenant_id da URL.
3. Toda leitura/escrita passa por RLS com `can_access(tenant_id, modulo, permissao)`.
4. Módulo não contratado: bloqueado na UI (ModuleGate) **e** no banco (`has_module`).

## Estado atual
Interface completa com **dados de demonstração visual** salvos só no navegador. Falta conectar o Supabase próprio para ativar login real e persistência.
