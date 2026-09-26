# Guia de operação (português simples)

## Como o sistema está organizado
- **Páginas:** pasta `src/routes`. Cada arquivo é uma página (ex.: `app/rh.tsx` = tela de RH).
- **Módulos e preços:** arquivo `src/lib/modules.ts`.
- **Banco de dados:** arquivos em `database/`. É o "desenho" das tabelas e regras de acesso.
- **Documentação:** esta pasta `docs`.

## O que pode mexer com tranquilidade
- Textos, nomes e preços dos módulos em `src/lib/modules.ts`.
- Textos das páginas.
- Pedir mudanças visuais pelo chat da Lovable.

## O que NÃO mexer sem ajuda
- Arquivos em `database/` (regras de segurança).
- `src/routeTree.gen.ts` (gerado automaticamente).
- Nunca colar a chave `SERVICE_ROLE_KEY` em código ou no chat.

## Como pedir ajuda
Descreva: qual página, o que fez, o que esperava e o que aconteceu. Um print ajuda muito.

## Como validar se está funcionando
1. Abrir `/login` e entrar.
2. Ver o painel em `/app/dashboard`.
3. Em "Módulos e plano", desligar um módulo: ele deve ficar com cadeado no menu e a página deve mostrar "não contratado".
4. Num módulo ativo, cadastrar um registro e ver ele aparecer na lista e na auditoria.
5. Após ligar o banco: rodar o teste Tenant A/B (ver `BANCO.md`).

## Atenção
Hoje tudo marcado como **"Demonstração visual"** fica salvo só no seu navegador — não é dado real.

## Onde ficam as coisas
- Módulos: `src/lib/modules.ts` e `src/routes/app/`
- Rotas: `docs/ROTAS.md`
- Variáveis: `docs/SEGURANCA.md`
