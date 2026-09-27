# CURRENT TASK — Naia

ID: OPS-001
STATUS: APPROVED
TYPE: DIAGNOSTIC_ONLY

## Objetivo

Diagnosticar, sem corrigir, a tela global de erro "Esta página não carregou / This page didn't load" observada na aplicação Engenharia Inteligente publicada no Vercel.

## Referências

- Repositório: `prospectaengenhariadesoftware-svg/pixel-perfect-render-5896`
- Branch do protocolo: `chore/naia-coordination`
- Branch de produção a comparar: `main`
- Commit de produção observado: `e170d0e7901356f9c2584f7000d2ef943f57773a`
- Supabase: self-hosted na VPS
- Migration de atenção: `database/0008_session_registration_and_modules.sql`
- RPC de atenção: `register_company_from_session`

## Ações autorizadas

Somente leitura e diagnóstico:

1. Identificar, se possível, a URL/rota que dispara o erro.
2. Coletar a mensagem real da exceção e stack trace disponíveis.
3. Identificar arquivo/linha relacionados quando possível.
4. Verificar por leitura logs acessíveis da aplicação/VPS e, se houver acesso autorizado já configurado, logs do Vercel.
5. Verificar por leitura o estado real do Supabase VPS e comparar com o que o commit de produção espera encontrar.
6. Verificar existência/compatibilidade de tabelas, colunas, funções/RPCs, RLS e policies relacionadas ao fluxo afetado.
7. Verificar especificamente `tenant`, `tenant_users`, `tenant_settings`, autenticação Supabase, `register_company_from_session`, migration `0008`, REST/RPC e respostas 401/403/404/500 ou erros PostgreSQL.
8. Informar se a migration `0008` está integralmente aplicada, parcialmente aplicada ou ausente no banco real, com evidência de leitura.
9. Registrar comandos de diagnóstico utilizados, omitindo completamente segredos.

## Ações proibidas

- Não alterar arquivos ou código.
- Não executar migrations.
- Não alterar banco, schema, dados, RLS ou policies.
- Não alterar Supabase, Vercel ou variáveis de ambiente.
- Não fazer commit, push, merge, rebase, reset ou deploy.
- Não reiniciar serviços ou containers.
- Não instalar pacotes.
- Não expor senhas, tokens, API keys, JWTs ou `service_role`.
- Não tentar corrigir o problema mesmo que a causa seja encontrada.

## Relatório obrigatório

Responder em português contendo somente:

1. rota afetada, se identificada;
2. erro encontrado;
3. stack trace relevante;
4. arquivo/linha relacionados;
5. origem provável;
6. situação do Supabase;
7. situação da migration `0008`;
8. incompatibilidades entre código e banco;
9. evidências e comandos de leitura utilizados, sem segredos;
10. diagnóstico técnico;
11. correção recomendada, apenas descrita e não executada.

Se não houver acesso aos logs do Vercel, declarar explicitamente: `NÃO TENHO ACESSO AOS LOGS DO VERCEL`.

Ao terminar, parar e aguardar nova autorização.
