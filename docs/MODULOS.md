# Módulos

| Módulo | Rota | Preço/mês | Conteúdo inicial |
|---|---|---|---|
| Home / Dashboard | /app/dashboard | Incluso | Visão geral e cartões dos módulos |
| Empresa | /app/empresa | R$ 149 | Unidades, documentos |
| Recursos Humanos | /app/rh | R$ 349 | Colaboradores, cargos, departamentos |
| Suprimentos | /app/suprimentos | R$ 299 | Fornecedores, materiais, requisições |
| Obras | /app/obras | R$ 399 | Obras, tarefas |
| Financeiro | /app/financeiro | R$ 449 | Contas a pagar/receber, categorias |

## Regras
- Cada módulo é ativado/desativado por empresa (`tenant_modules`; hoje simulado em `/app/modulos`).
- Módulo não contratado: aparece com cadeado no menu e a página mostra "não contratado" com link para contratação.
- Permissões por módulo e perfil (`tenant_permissions`).

## Como adicionar um módulo
1. Adicionar em `src/lib/modules.ts`.
2. Criar `src/routes/app/<modulo>.tsx` usando `ModuleWorkspace`.
3. Inserir em `subscription_modules` e criar as tabelas com o padrão de `BANCO.md`.
