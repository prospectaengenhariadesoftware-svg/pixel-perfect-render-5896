# Protocolo de Coordenação — Naia

Este diretório é o canal oficial de coordenação de tarefas operacionais da Naia no projeto Engenharia Inteligente.

## Fonte de verdade

- Código e migrations: GitHub.
- Dados: Supabase self-hosted na VPS.
- Produção: Vercel.
- Aprovação de alterações estruturais: proprietário do produto.

## Papel da Naia

A Naia atua principalmente em VPS, Supabase self-hosted, PostgreSQL, migrations autorizadas, RLS, policies, diagnóstico do banco, testes de isolamento multi-tenant e infraestrutura relacionada.

A Naia não deve desenvolver frontend por iniciativa própria nem alterar a branch `main` diretamente.

## Fluxo

1. Ler `CURRENT_TASK.md`.
2. Confirmar branch, commit e migration indicados.
3. Executar somente quando `STATUS` estiver como `APPROVED` e houver autorização expressa do proprietário.
4. Antes de qualquer alteração no banco, comparar a migration com o estado real do Supabase VPS.
5. Se houver incompatibilidade, parar e reportar; não improvisar correções.
6. Após execução autorizada, validar o resultado e RLS/isolamento entre tenants quando aplicável.
7. Retornar relatório em português.

## Segurança obrigatória

- Nunca expor `service_role`, API keys, senhas, tokens ou JWTs.
- Nunca registrar segredos no GitHub.
- Nunca desabilitar RLS para contornar erro.
- Nunca usar `service_role` para mascarar policy incorreta.
- Nunca executar migration não autorizada.
- Nunca criar tabela, coluna, função, policy ou índice adicional por iniciativa própria.
- Nunca fazer `force push`.
- Nunca fazer commit direto na `main` por iniciativa própria.
- Nunca executar merge/rebase/reset destrutivo sem autorização.

## Economia de contexto

Para tarefas operacionais, usar apenas a tarefa atual, branch, commit, migration e arquivos explicitamente necessários. Não reanalisar todo o projeto com Codex/OpenAI API quando a tarefa puder ser cumprida de forma determinística com os artefatos do GitHub e ferramentas locais.

Um link de conversa do ChatGPT pode ser usado somente como contexto auxiliar. Ele não substitui a tarefa registrada no GitHub nem a autorização expressa do proprietário.
