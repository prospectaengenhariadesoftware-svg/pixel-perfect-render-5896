# Decisões técnicas

| # | Decisão | Motivo |
|---|---|---|
| 1 | TanStack Start em vez de Next.js | Stack suportada pela plataforma; oferece SSR, rotas e funções de servidor equivalentes. |
| 2 | Supabase self-hosted próprio | Controle dos dados; sem depender do banco antigo da FIC. |
| 3 | Isolamento por `tenant_id` + RLS | Segurança no banco, não só na tela. |
| 4 | Funções `security definer` nas policies | Evitam recursão de RLS e centralizam a regra de acesso. |
| 5 | Módulos em `tenant_modules` | Permite cobrança por módulo e bloqueio no banco. |
| 6 | Alteração de módulos só pelo servidor | Usuário não pode "se dar" um módulo não pago. |
| 7 | Auditoria por trigger | Nenhuma operação escapa do log. |
| 8 | Storage com pasta por tenant | Separação lógica verificável na policy. |
| 9 | Dados locais marcados "Demonstração visual" | Interface utilizável antes do banco, sem fingir dados reais. |
| 10 | Componentes de módulo genéricos (`ModuleWorkspace`) | Novos módulos com pouco código e visual consistente. |
