# CURRENT TASK — Naia

ID: NONE
STATUS: WAITING

## Regra de execução

`WAITING` significa que não existe tarefa autorizada para execução.

A Naia não deve executar alterações no banco, VPS, GitHub, Vercel ou aplicação com base neste arquivo enquanto o status estiver `WAITING`.

Quando houver tarefa, este documento deverá informar no mínimo:

- ID da tarefa;
- STATUS (`DRAFT`, `READY_FOR_APPROVAL`, `APPROVED`, `EXECUTED` ou `BLOCKED`);
- objetivo;
- repositório;
- branch;
- commit SHA;
- migration/arquivos envolvidos;
- ações autorizadas;
- ações proibidas;
- validações obrigatórias;
- rollback, quando aplicável.

Mesmo com `STATUS: APPROVED`, alterações estruturais de banco somente devem ser executadas após autorização expressa do proprietário.
