import { useEffect, useState } from "react";
import { Eye, Printer, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant-context";

type Employee = Record<string, unknown> & { id: string; name: string };
type PrintMode = "completa" | "resumida";
const internal = new Set(["tenant_id", "employee_id", "created_by", "updated_by", "deleted_at"]);
const sensitive = /cpf|rg|document|birth|nascimento|bank|banco|agencia|conta|pix|salario|salary|remuner|benefit|beneficio|pis|ctps|cnh|dependente/i;
const labels: Record<string,string> = {
  name:"Nome completo", position:"Cargo", status:"Situação", email:"E-mail", phone:"Telefone",
  cpf:"CPF", rg:"RG", birth_date:"Data de nascimento", admission_date:"Admissão",
  department_id:"Departamento", position_id:"Cargo", function_id:"Função", address:"Endereço",
  created_at:"Cadastro realizado em", updated_at:"Última atualização", id:"Identificador"
};
const formatLabel = (key: string) => labels[key] ?? key.replace(/_/g," ").replace(/^./,c=>c.toUpperCase());
function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Não informado";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function printableFields(employee: Employee, mode: PrintMode) {
  return Object.entries(employee).filter(([key]) => !internal.has(key) && (mode === "completa" || !sensitive.test(key)));
}
export function EmployeeRecords() {
  const supabase = getSupabase();
  const { tenant, status } = useTenant();
  const [items,setItems] = useState<Employee[]>([]);
  const [selected,setSelected] = useState<Employee|null>(null);
  const [detailsLoading,setDetailsLoading] = useState(false);
  const [mode,setMode] = useState<PrintMode>("resumida");
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState<string|null>(null);
  useEffect(()=>{
    if (!supabase || !tenant?.id || status !== "ready") return;
    let cancelled = false;
    setLoading(true); setError(null);
    void supabase.from("rh_employees").select("*").eq("tenant_id",tenant.id).is("deleted_at",null).order("name")
      .then(({data,error})=>{
        if(cancelled) return;
        if(error) setError(error.message);
        else setItems((data ?? []) as Employee[]);
        setLoading(false);
      });
    return ()=>{cancelled=true};
  },[supabase,tenant?.id,status]);
  async function openRecord(employee: Employee) {
    if (!supabase || !tenant?.id) return;
    setError(null); setDetailsLoading(true); setSelected(null);
    try {
      const tables = ["rh_employee_personal_details","rh_employee_addresses","rh_employee_documents","rh_employee_bank_accounts","rh_employee_compensation"] as const;
      const results = await Promise.all(tables.map(table => supabase.from(table).select("*").eq("tenant_id",tenant.id).eq("employee_id",employee.id).maybeSingle()));
      // Falhar fechado: se uma tabela estiver inacessível, não exibir ficha incompleta como completa.
      const failed = results.find(result => result.error);
      if (failed?.error) throw failed.error;
      const combined: Employee = {...employee};
      for (const result of results) if (result.data) {
        for (const [key,value] of Object.entries(result.data)) {
          if (!internal.has(key) && key !== "id") combined[key] = value;
        }
      }
      setSelected(combined);
    } catch(e) { setError(e instanceof Error ? e.message : "Não foi possível consultar a ficha."); }
    finally { setDetailsLoading(false); }
  }
  function printRecord(employee: Employee, printMode: PrintMode) {
    // A impressão usa somente dados já retornados pelo Supabase sob RLS.
    // Nenhuma ficha é armazenada em serviços externos.
    const popup = window.open("","_blank","noopener,noreferrer,width=900,height=700");
    if (!popup) { setError("Permita janelas pop-up para imprimir a ficha."); return; }
    const escapeHtml = (s: string) => s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] ?? c));
    const rows = printableFields(employee,printMode).map(([key,value])=>
      `<div class="field"><div class="label">${escapeHtml(formatLabel(key))}</div><div>${escapeHtml(formatValue(value))}</div></div>`
    ).join("");
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Ficha cadastral</title>
      <style>@page{size:A4;margin:16mm}body{font:12px Arial,sans-serif;color:#151515;margin:0}
      header{border-bottom:2px solid #222;padding-bottom:12px;margin-bottom:20px}h1{font-size:18px;margin:0 0 6px}
      .muted,.label{color:#555}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .field{padding:8px 0;border-bottom:1px solid #ddd;overflow-wrap:anywhere;break-inside:avoid}
      .label{font-size:10px;margin-bottom:5px}footer{margin-top:24px;font-size:10px;color:#666}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
      <header><h1>Ficha cadastral do colaborador</h1><div>${escapeHtml(tenant?.name ?? "Empresa")}</div>
      <p class="muted">Versão ${printMode === "completa" ? "completa" : "resumida"} · Informações cadastrais</p></header>
      <div class="grid">${rows}</div><footer>Documento gerado a partir das informações disponíveis no cadastro.</footer>
      <script>window.addEventListener("load",()=>window.print());<\/script></body></html>`);
    popup.document.close();
  }
  return <div className="space-y-4">
    {error && <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
    {loading ? <p className="text-sm text-muted-foreground">Carregando colaboradores...</p> :
      items.length === 0 ? <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">Nenhum colaborador encontrado.</p> :
      <div className="grid gap-3 md:grid-cols-2">{items.map(item=><div key={item.id} className="rounded-lg border p-4">
        <div className="font-semibold">{item.name}</div><p className="text-sm text-muted-foreground">{formatValue(item.position)} · {formatValue(item.status)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm" onClick={()=>void openRecord(item)}><Eye size={16}/> Visualizar</button>
          <button className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm" onClick={()=>printRecord(item,"resumida")}><Printer size={16}/> Imprimir resumida</button>
        </div></div>)}</div>}
    {detailsLoading && <p className="text-sm text-muted-foreground">Consultando ficha cadastral...</p>}
    {selected && <div role="dialog" aria-modal="true" aria-label="Ficha do colaborador" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{selected.name}</h2>
          <p className="text-sm text-muted-foreground">Ficha cadastral · {tenant?.name}</p></div>
          <button aria-label="Fechar" className="rounded-md p-2 hover:bg-muted" onClick={()=>setSelected(null)}><X size={20}/></button></div>
        <label className="mb-4 block text-sm font-medium">Tipo de ficha
          <select className="ml-3 rounded-md border bg-background px-3 py-2" value={mode} onChange={e=>setMode(e.target.value as PrintMode)}>
            <option value="resumida">Resumida</option><option value="completa">Completa (inclui dados sensíveis)</option>
          </select></label>
        <div className="grid gap-3 sm:grid-cols-2">{printableFields(selected,mode).map(([key,value])=>
          <div key={key} className="min-w-0 rounded-md border p-3"><p className="text-xs text-muted-foreground">{formatLabel(key)}</p>
            <p className="break-words text-sm font-medium">{formatValue(value)}</p></div>)}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-md border px-4 py-2 text-sm" onClick={()=>setSelected(null)}>Fechar</button>
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={()=>printRecord(selected,mode)}>
            <Printer size={16}/> Imprimir ficha</button>
        </div>
      </div></div>}
  </div>;
}
