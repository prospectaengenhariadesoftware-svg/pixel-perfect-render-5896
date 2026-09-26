# Rotas

## Públicas
- `/` — apresentação
- `/login` — entrar
- `/forgot-password` — recuperar senha

## Autenticadas (layout `/app`)
- `/app` → redireciona para `/app/dashboard`
- `/app/dashboard`
- `/app/modulos` — módulos contratados e plano

## Por módulo (bloqueadas se não contratadas)
- `/app/empresa`, `/app/rh`, `/app/suprimentos`, `/app/obras`, `/app/financeiro`

## Admin (planejadas)
- `/app/usuarios`, `/app/configuracoes` — dono do tenant
- `/admin` — super-admin da plataforma (`platform_admins`)

## Proteção
Hoje o layout `/app` não exige login (modo demonstração). Ao conectar o Supabase, as rotas autenticadas passam para um layout protegido que redireciona para `/login`, e cada função de servidor valida sessão, tenant e módulo. Nenhuma rota admin será publicada sem essa proteção.
