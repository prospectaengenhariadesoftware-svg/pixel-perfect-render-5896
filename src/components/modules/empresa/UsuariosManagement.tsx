import { useEffect, useState } from "react";
import { Loader2, MailPlus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabase } from "@/lib/supabase";
import { maskPhone } from "@/lib/br-format";

type TenantUser = { tenant_user_id: string; user_id: string; display_name: string | null; email: string | null; phone: string | null; avatar_url: string | null; is_owner: boolean; status: string; role_name: string | null; created_at: string };
type TenantRole = { id: string; name: string };
type Props = { tenantId: string; canManage: boolean; users: TenantUser[]; loading?: boolean; onChanged: () => Promise<void> | void };
const fieldClass = "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const buttonClass = "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium disabled:opacity-50";
function dateShort(value: string) { return new Date(value).toLocaleDateString("pt-BR"); }
function labelStatus(value: string) { return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "—"; }

export function UsuariosManagement({ tenantId, canManage, users, loading, onChanged }: Props) {
  const supabase = getSupabase();
  const [roles, setRoles] = useState<TenantRole[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !tenantId) return;
    let active = true;
    void supabase.from("tenant_roles").select("id, name").eq("tenant_id", tenantId).order("name").then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message); else setRoles((data ?? []) as TenantRole[]);
    });
    return () => { active = false; };
  }, [supabase, tenantId]);

  async function invite() {
    if (!supabase || !canManage) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError("Informe um e-mail válido."); return; }
    setBusy("invite"); setError(null); setMessage(null);
    try {
      const { data, error } = await supabase.rpc("invite_tenant_user", { _tenant: tenantId, _email: cleanEmail, _role_id: roleId || null });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      setEmail(""); setRoleId(""); setInviteOpen(false);
      setMessage(row?.expires_at ? `Convite criado. Validade: ${new Date(row.expires_at).toLocaleString("pt-BR")}.` : "Convite criado com sucesso.");
      await onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível criar o convite."); }
    finally { setBusy(null); }
  }

  async function changeRole(user: TenantUser, nextRole: string) {
    if (!supabase || !canManage || user.is_owner || !nextRole) return;
    setBusy(user.tenant_user_id); setError(null); setMessage(null);
    try {
      const { error } = await supabase.rpc("update_tenant_user_role", { _tenant_user: user.tenant_user_id, _role_id: nextRole });
      if (error) throw error;
      setMessage("Perfil atualizado com sucesso."); await onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível alterar o perfil."); }
    finally { setBusy(null); }
  }

  async function toggleStatus(user: TenantUser) {
    if (!supabase || !canManage) return;
    const next = user.status === "ativo" ? "inativo" : "ativo";
    setBusy(user.tenant_user_id); setError(null); setMessage(null);
    try {
      const { error } = await supabase.rpc("update_tenant_user_status", { _tenant_user: user.tenant_user_id, _status: next });
      if (error) throw error;
      setMessage(`Usuário ${next === "ativo" ? "ativado" : "inativado"} com sucesso.`); await onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível alterar o status."); }
    finally { setBusy(null); }
  }

  async function removeUser(user: TenantUser) {
    if (!supabase || !canManage) return;
    if (!window.confirm(`Remover ${user.display_name || user.email || "este usuário"} da empresa?`)) return;
    setBusy(user.tenant_user_id); setError(null); setMessage(null);
    try {
      const { error } = await supabase.rpc("remove_tenant_user", { _tenant_user: user.tenant_user_id });
      if (error) throw error;
      setMessage("Vínculo removido com sucesso."); await onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível remover o usuário."); }
    finally { setBusy(null); }
  }

  return <Card className="shadow-card">
    <CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Usuários vinculados</CardTitle><p className="mt-1 text-sm text-muted-foreground">Gerencie acessos, perfis e status dos usuários desta empresa.</p></div>{canManage && <button type="button" onClick={() => setInviteOpen((v) => !v)} className={`${buttonClass} gap-2 bg-primary text-primary-foreground`}><MailPlus className="h-4 w-4" />Convidar usuário</button>}</div></CardHeader>
    <CardContent className="space-y-5">
      {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {message && <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">{message}</div>}
      {inviteOpen && canManage && <div className="rounded-lg border bg-muted/20 p-4"><div className="mb-3 font-semibold">Novo convite</div><div className="grid gap-3 md:grid-cols-[1fr_260px_auto]"><input type="email" className={fieldClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@empresa.com.br" /><select className={fieldClass} value={roleId} onChange={(e) => setRoleId(e.target.value)}><option value="">Sem perfil definido</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><button type="button" disabled={busy === "invite"} onClick={() => void invite()} className={`${buttonClass} bg-primary text-primary-foreground`}>{busy === "invite" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar convite"}</button></div>{roles.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Ainda não existem perfis cadastrados para esta empresa. O convite pode ser criado sem perfil e configurado posteriormente.</p>}</div>}
      {loading ? <div className="text-sm text-muted-foreground">Carregando usuários...</div> : users.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Não há usuários vinculados a esta empresa.</div> : <div className="grid gap-3 md:grid-cols-2">{users.map((user) => <div key={user.tenant_user_id} className="rounded-lg border bg-card p-4"><div className="flex items-start gap-3">{user.avatar_url ? <img src={user.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">{(user.display_name || user.email || "U").charAt(0).toUpperCase()}</div>}<div className="min-w-0 flex-1"><div className="truncate font-semibold">{user.display_name || "Usuário"}</div><div className="truncate text-sm text-muted-foreground">{user.email || "E-mail não informado"}</div></div></div><div className="mt-3 space-y-2 text-sm">{user.phone && <div>{maskPhone(user.phone)}</div>}<div className="text-muted-foreground">{user.is_owner ? "Administrador / proprietário" : user.role_name || "Usuário"} · {labelStatus(user.status)} · desde {dateShort(user.created_at)}</div>{canManage && <div className="grid gap-2 pt-2 sm:grid-cols-2">{!user.is_owner && <select className={fieldClass} disabled={busy === user.tenant_user_id || roles.length === 0} value={roles.find((r) => r.name === user.role_name)?.id || ""} onChange={(e) => void changeRole(user, e.target.value)}><option value="">Selecionar perfil</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>}<button type="button" disabled={busy === user.tenant_user_id} onClick={() => void toggleStatus(user)} className={`${buttonClass} border`}>{busy === user.tenant_user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : user.status === "ativo" ? "Inativar" : "Ativar"}</button>{!user.is_owner && <button type="button" disabled={busy === user.tenant_user_id} onClick={() => void removeUser(user)} className={`${buttonClass} gap-2 border text-destructive sm:col-span-2`}><Trash2 className="h-4 w-4" />Remover da empresa</button>}</div>}</div></div>)}</div>}
      {!canManage && <p className="text-xs text-muted-foreground">Seu acesso permite visualizar os usuários, mas não gerenciar vínculos e permissões.</p>}
    </CardContent>
  </Card>;
}
