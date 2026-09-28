import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/app/ui-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSupabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant-context";

type Status = "ativo" | "inativo";
type Department = { id: string; name: string; description: string | null; status: Status };
type Position = { id: string; department_id: string | null; name: string; description: string | null; status: Status };
type FunctionRow = { id: string; department_id: string | null; position_id: string | null; name: string; description: string | null; status: Status };
type MasterKind = "department" | "position" | "function";
type MasterForm = { id: string | null; name: string; description: string; status: Status; department_id: string; position_id: string };

const fieldClass = "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const emptyForm: MasterForm = { id: null, name: "", description: "", status: "ativo", department_id: "", position_id: "" };

export function RhModule() {
  const supabase = getSupabase();
  const { tenant, status: tenantStatus } = useTenant();
  const tenantId = tenant?.id ?? null;
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [functions, setFunctions] = useState<FunctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<MasterKind | null>(null);
  const [form, setForm] = useState<MasterForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadMasters() {
    if (!supabase || !tenantId) return;
    setLoading(true); setError(null);
    try {
      const [d, p, f] = await Promise.all([
        supabase.from("rh_departments").select("id,name,description,status").eq("tenant_id", tenantId).order("name"),
        supabase.from("rh_positions").select("id,department_id,name,description,status").eq("tenant_id", tenantId).order("name"),
        supabase.from("rh_functions").select("id,department_id,position_id,name,description,status").eq("tenant_id", tenantId).order("name"),
      ]);
      if (d.error) throw d.error; if (p.error) throw p.error; if (f.error) throw f.error;
      setDepartments((d.data ?? []) as Department[]); setPositions((p.data ?? []) as Position[]); setFunctions((f.data ?? []) as FunctionRow[]);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar os cadastros do RH."); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (tenantStatus !== "loading" && supabase && tenantId) void loadMasters(); }, [tenantStatus, supabase, tenantId]);

  function openNew(kind: MasterKind) { setEditing(kind); setForm(emptyForm); setError(null); setSuccess(null); }
  function openEdit(kind: MasterKind, row: Department | Position | FunctionRow) {
    setEditing(kind); setError(null); setSuccess(null);
    setForm({ id: row.id, name: row.name, description: row.description || "", status: row.status, department_id: "department_id" in row ? row.department_id || "" : "", position_id: "position_id" in row ? row.position_id || "" : "" });
  }

  async function saveMaster() {
    if (!supabase || !tenantId || !editing || !form.name.trim()) return;
    setSaving(true); setError(null); setSuccess(null);
    try {
      const table = editing === "department" ? "rh_departments" : editing === "position" ? "rh_positions" : "rh_functions";
      const payload: Record<string, unknown> = { tenant_id: tenantId, name: form.name.trim(), description: form.description.trim() || null, status: form.status };
      if (editing !== "department") payload.department_id = form.department_id || null;
      if (editing === "function") payload.position_id = form.position_id || null;
      const query = form.id ? supabase.from(table).update(payload).eq("id", form.id).eq("tenant_id", tenantId) : supabase.from(table).insert(payload);
      const { error: saveError } = await query; if (saveError) throw saveError;
      setEditing(null); setForm(emptyForm); setSuccess("Cadastro salvo com sucesso."); await loadMasters();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar o cadastro."); }
    finally { setSaving(false); }
  }

  async function removeMaster(kind: MasterKind, id: string, name: string) {
    if (!supabase || !tenantId || !window.confirm(`Excluir “${name}”?`)) return;
    const table = kind === "department" ? "rh_departments" : kind === "position" ? "rh_positions" : "rh_functions";
    setError(null); setSuccess(null);
    const { error: deleteError } = await supabase.from(table).delete().eq("id", id).eq("tenant_id", tenantId);
    if (deleteError) { setError(deleteError.message); return; }
    setSuccess("Cadastro excluído com sucesso."); await loadMasters();
  }

  const activePositions = useMemo(() => positions.filter((p) => !form.department_id || p.department_id === form.department_id), [positions, form.department_id]);

  function MasterEditor() {
    if (!editing) return null;
    const title = editing === "department" ? "Departamento" : editing === "position" ? "Cargo" : "Função";
    return <div className="rounded-lg border bg-muted/20 p-4 space-y-4"><div className="font-semibold">{form.id ? `Editar ${title}` : `Novo ${title}`}</div><div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-1.5"><span className="text-sm font-medium">Nome *</span><input className={fieldClass} value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></label>
      <label className="space-y-1.5"><span className="text-sm font-medium">Status</span><select className={fieldClass} value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value as Status }))}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></label>
      {editing !== "department" && <label className="space-y-1.5"><span className="text-sm font-medium">Departamento</span><select className={fieldClass} value={form.department_id} onChange={(e) => setForm((v) => ({ ...v, department_id: e.target.value, position_id: "" }))}><option value="">Sem departamento específico</option>{departments.filter((d) => d.status === "ativo").map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}
      {editing === "function" && <label className="space-y-1.5"><span className="text-sm font-medium">Cargo</span><select className={fieldClass} value={form.position_id} onChange={(e) => setForm((v) => ({ ...v, position_id: e.target.value }))}><option value="">Sem cargo específico</option>{activePositions.filter((p) => p.status === "ativo").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
      <label className="space-y-1.5 md:col-span-2"><span className="text-sm font-medium">Descrição</span><textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} /></label>
    </div><div className="flex justify-end gap-2"><button className="h-10 rounded-md border px-4 text-sm" onClick={() => setEditing(null)}>Cancelar</button><button disabled={saving || !form.name.trim()} className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50" onClick={() => void saveMaster()}>{saving ? "Salvando..." : "Salvar"}</button></div></div>;
  }

  function MasterList({ kind, rows }: { kind: MasterKind; rows: Array<Department | Position | FunctionRow> }) {
    const title = kind === "department" ? "departamento" : kind === "position" ? "cargo" : "função";
    return <div className="space-y-4"><div className="flex justify-end"><button onClick={() => openNew(kind)} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" />Novo {title}</button></div>{editing === kind && <MasterEditor />}{loading ? <div className="text-sm text-muted-foreground">Carregando...</div> : rows.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum {title} cadastrado.</div> : <div className="grid gap-3 md:grid-cols-2">{rows.map((row) => <div key={row.id} className="rounded-lg border p-4"><div className="flex justify-between gap-3"><div><div className="font-semibold">{row.name}</div><div className="text-sm text-muted-foreground">{row.description || "Sem descrição"}</div><div className="mt-2 text-xs uppercase text-muted-foreground">{row.status}</div></div><div className="flex gap-1"><button className="rounded-md p-2 hover:bg-muted" onClick={() => openEdit(kind, row)}><Pencil className="h-4 w-4" /></button><button className="rounded-md p-2 text-destructive hover:bg-destructive/10" onClick={() => void removeMaster(kind, row.id, row.name)}><Trash2 className="h-4 w-4" /></button></div></div></div>)}</div>}</div>;
  }

  return <div className="mx-auto w-full max-w-6xl space-y-6"><PageHeader eyebrow="Recursos Humanos" title="Gestão de Pessoas" description="Colaboradores, departamentos, cargos, funções e informações profissionais da empresa." />
    {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}{success && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">{success}</div>}
    <Tabs defaultValue="colaboradores"><TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="colaboradores">Colaboradores</TabsTrigger><TabsTrigger value="departamentos">Departamentos</TabsTrigger><TabsTrigger value="cargos">Cargos</TabsTrigger><TabsTrigger value="funcoes">Funções</TabsTrigger></TabsList>
      <TabsContent value="colaboradores"><Card className="shadow-card"><CardHeader><CardTitle>Colaboradores</CardTitle></CardHeader><CardContent><div className="rounded-lg border border-dashed p-8 text-center"><UsersRound className="mx-auto mb-3 h-8 w-8 text-muted-foreground"/><div className="font-semibold">Cadastro de colaboradores</div><p className="mt-1 text-sm text-muted-foreground">A ficha completa será integrada nesta etapa com dados pessoais, profissionais, documentos, endereço, banco e remuneração.</p></div></CardContent></Card></TabsContent>
      <TabsContent value="departamentos"><Card className="shadow-card"><CardHeader><CardTitle>Departamentos</CardTitle></CardHeader><CardContent><MasterList kind="department" rows={departments}/></CardContent></Card></TabsContent>
      <TabsContent value="cargos"><Card className="shadow-card"><CardHeader><CardTitle>Cargos</CardTitle></CardHeader><CardContent><MasterList kind="position" rows={positions}/></CardContent></Card></TabsContent>
      <TabsContent value="funcoes"><Card className="shadow-card"><CardHeader><CardTitle>Funções</CardTitle></CardHeader><CardContent><MasterList kind="function" rows={functions}/></CardContent></Card></TabsContent>
    </Tabs>
  </div>;
}
