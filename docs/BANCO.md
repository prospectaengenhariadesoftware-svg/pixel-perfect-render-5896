# Banco de dados

Script completo: `database/0001_base_multitenant.sql`.

## Tabelas base
| Tabela | Função |
|---|---|
| platform_admins | Administradores da plataforma (super-admin) |
| tenants | Empresas clientes |
| tenant_users | Vínculo usuário ↔ empresa (+ dono, cargo) |
| tenant_roles | Perfis de acesso por empresa |
| tenant_permissions | Ler/escrever/excluir por módulo e perfil |
| tenant_invites | Convites por e-mail com token e validade |
| tenant_settings | Configurações (jsonb) |
| tenant_files | Metadados de arquivos (caminho `<tenant_id>/<modulo>/...`) |
| tenant_audit_logs | Trilha de auditoria |
| subscription_plans / subscription_modules | Catálogo de planos e módulos |
| tenant_subscriptions / tenant_modules | O que cada empresa contratou |

## Campos padrão de tabelas de negócio
`id, tenant_id, created_at, updated_at, created_by, updated_by, deleted_at (quando fizer sentido), status (quando fizer sentido)`.
Modelo pronto: `rh_employees` no script.

## Regras de isolamento
- Toda tabela de negócio tem `tenant_id not null`.
- RLS habilitado em todas as tabelas sensíveis.
- Policies usam funções `security definer`: `is_tenant_member`, `is_tenant_owner`, `has_module`, `can_access`, `is_platform_admin`.
- Toda nova tabela: `CREATE TABLE` → `GRANT` → `ENABLE RLS` → `CREATE POLICY` → trigger `audit_row`.
- `tenant_modules` e `tenant_subscriptions` só são alterados pelo servidor (cobrança).

## Tabelas futuras por módulo
- Empresa: company_profiles, company_units, company_documents
- RH: rh_employees, rh_roles, rh_departments, rh_documents
- Suprimentos: suppliers, materials, purchase_requests, quotations, purchase_orders
- Obras: works, work_tasks, work_documents, work_progress, work_cost_centers
- Financeiro: financial_accounts_payable, financial_accounts_receivable, financial_categories, financial_cost_centers, financial_transactions

## Teste Tenant A/B
`database/tests/tenant_isolation.sql` — confirma que o usuário B não enxerga dados do tenant A.
