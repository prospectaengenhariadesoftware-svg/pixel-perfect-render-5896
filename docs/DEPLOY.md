# Deploy

## GitHub
Conecte o projeto ao GitHub pelas configurações da Lovable. Cada alteração vira commit; o repositório é a fonte da verdade.

## Hospedagem
- **Padrão:** botão "Publicar" da Lovable (inclui SSR e funções de servidor).
- **Vercel:** possível importando o repositório, mas exige adaptador de TanStack Start para Vercel (preset `vercel` do Nitro). Validar antes de migrar.

## Variáveis de ambiente
Ver tabela em `SEGURANCA.md`. Configurar separadamente para preview e produção.

## Supabase self-hosted
1. Acessar o Studio em https://supabase.codexa.api.br.
2. Rodar `database/0001_base_multitenant.sql` no SQL Editor.
3. Rodar o teste `database/tests/tenant_isolation.sql`.
4. Configurar Auth (URL do site e redirecionamentos para os domínios de preview e produção).
5. Fazer backup diário do Postgres da VPS.

## Preview x Produção
- Preview: cada alteração atualiza a prévia automaticamente. Ideal usar um banco/projeto de teste.
- Produção: só após validar login, bloqueio de módulos e teste A/B.
