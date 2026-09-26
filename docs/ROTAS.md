# Rotas

## Públicas
- `/` — apresentação
- `/login` — entrar
- `/forgot-password` — recuperar senha
- `/reset-password` — definir nova senha (link do e-mail)

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
O layout `/app` (ssr desligado) redireciona para `/login` sem sessão válida. Sem Supabase configurado, abre em "modo de configuração" sem nenhum dado. A proteção real dos dados é o RLS no banco.
