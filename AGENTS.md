<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Supabase no navegador só via `getSupabase()` em src/lib/supabase.ts com chave anon — service role nunca no cliente.
- Tenant ativo vem de `tenant_users` via TenantProvider; nunca da URL — isolamento depende do RLS.
- Nenhum dado fictício na UI; sem conexão, mostrar estados vazios/“modo de configuração”.
