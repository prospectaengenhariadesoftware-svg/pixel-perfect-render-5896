import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { PageHeader } from "@/components/app/ui-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { maskCep, maskCnpj, maskCpf, maskPhone, onlyDigits } from "@/lib/br-format";
import { getSupabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant-context";

type CompanyData = {
  personType?: "pj" | "pf"; legalName?: string; tradeName?: string; document?: string;
  email?: string; phone?: string; cep?: string; street?: string; number?: string;
  complement?: string; neighborhood?: string; city?: string; state?: string; [key: string]: unknown;
};
type OwnerContactRow = { id: string; name: string; phone: string | null; email: string | null; function_title: string | null };
type OwnerContact = { id: string; name: string; phone: string | null; email: string | null; function: string | null };
type TenantUserRow = { id: string; user_id: string; is_owner: boolean; status: string; created_at: string; tenant_roles: { name: string | null } | null };
type TenantUser = { id: string; user_id: string; role: string | null; is_owner: boolean; status: string; created_at: string };

const emptyCompany: CompanyData = { personType: "pj", legalName: "", tradeName: "", document: "", email: "", phone: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" };
const fieldClass = "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
function dateShort(value?: string | null) { return value ? new Date(value).toLocaleDateString("pt-BR") : "—"; }

export function EmpresaModule() {
  const supabase = getSupabase();
  const { tenant, status: tenantStatus } = useTenant();
  const tenantId = tenant?.id ?? null;
  const [company, setCompany] = useState<CompanyData>(emptyCompany);
  const [storedSettings, setStoredSettings] = useState<Record<string, unknown>>({});
  const [owners, setOwners] = useState<OwnerContact[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState<"cnpj" | "cep" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tenantStatus === "loading") return;
    if (!supabase) { setError("Supabase não está configurado neste ambiente."); setLoading(false); return; }
    if (!tenantId) { setError("Nenhuma empresa ativa foi identificada para este usuário."); setLoading(false); return; }
    let cancelled = false;
    async function loadCompanyArea() {
      setLoading(true); setError(null);
      try {
        const { data: settings, error: settingsError } = await supabase.from("tenant_settings").select("settings").eq("tenant_id", tenantId).maybeSingle();
        if (settingsError) throw settingsError;
        const stored = settings?.settings && typeof settings.settings === "object" && !Array.isArray(settings.settings) ? settings.settings as Record<string, unknown> : {};
        const companyStored = stored as CompanyData;
        const { data: ownerRows, error: ownersError } = await supabase.from("tenant_owner_contacts").select("id, name, phone, email, function_title").eq("tenant_id", tenantId).order("name", { ascending: true });
        if (ownersError) throw ownersError;
        const { data: userRows, error: usersError } = await supabase.from("tenant_users").select("id, user_id, is_owner, status, created_at, tenant_roles(name)").eq("tenant_id", tenantId).order("is_owner", { ascending: false }).order("created_at", { ascending: true }).limit(500);
        if (usersError) throw usersError;
        if (!cancelled) {
          setStoredSettings(stored);
          setCompany({ ...emptyCompany, ...companyStored, tradeName: companyStored.tradeName || tenant?.name || "" });
          setOwners(((ownerRows ?? []) as OwnerContactRow[]).map((o) => ({ id: o.id, name: o.name, phone: o.phone, email: o.email, function: o.function_title })));
          setUsers(((userRows ?? []) as TenantUserRow[]).map((u) => ({ id: u.id, user_id: u.user_id, role: u.tenant_roles?.name ?? null, is_owner: u.is_owner, status: u.status, created_at: u.created_at })));
        }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Falha inesperada ao carregar dados da empresa."); }
      finally { if (!cancelled) setLoading(false); }
    }
    void loadCompanyArea(); return () => { cancelled = true; };
  }, [supabase, tenantId, tenantStatus, tenant?.name]);

  function change(field: keyof CompanyData, value: string) { setCompany((current) => ({ ...current, [field]: value })); setSuccess(null); setError(null); }

  async function lookupCnpj(value: string) {
    const digits = onlyDigits(value); if (digits.length !== 14) return;
    setLookingUp("cnpj"); setError(null); setSuccess(null);
    try {
      const response = await fetch(`/api/cnpj/${digits}`);
      const data = await response.json() as { error?: string; razao_social?: string; nome_fantasia?: string; email?: string | null; ddd_telefone_1?: string | null; cep?: string | null; logradouro?: string | null; numero?: string | null; complemento?: string | null; bairro?: string | null; municipio?: string | null; uf?: string | null };
      if (!response.ok) throw new Error(data.error || "CNPJ não localizado.");
      setCompany((current) => ({ ...current, personType: "pj", document: maskCnpj(digits), legalName: data.razao_social ?? current.legalName, tradeName: data.nome_fantasia || data.razao_social || current.tradeName, email: data.email ?? current.email, phone: data.ddd_telefone_1 ? maskPhone(data.ddd_telefone_1) : current.phone, cep: maskCep(data.cep ?? ""), street: data.logradouro ?? "", number: data.numero && data.numero !== "S/N" ? data.numero : "", complement: data.complemento ?? "", neighborhood: data.bairro ?? "", city: data.municipio ?? "", state: data.uf ?? "" }));
      setSuccess("Dados do CNPJ preenchidos automaticamente. Confira as informações antes de salvar.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível consultar o CNPJ."); }
    finally { setLookingUp(null); }
  }

  async function lookupCep(value: string) {
    if (company.personType !== "pf") return;
    const digits = onlyDigits(value); if (digits.length !== 8) return;
    setLookingUp("cep"); setError(null); setSuccess(null);
    try {
      const response = await fetch(`/api/cep/${digits}`);
      const data = await response.json() as { error?: string; street?: string; neighborhood?: string; city?: string; state?: string };
      if (!response.ok) throw new Error(data.error || "CEP não localizado.");
      setCompany((current) => ({ ...current, cep: maskCep(digits), street: data.street ?? "", neighborhood: data.neighborhood ?? "", city: data.city ?? "", state: data.state ?? "" }));
      setSuccess("Endereço preenchido automaticamente pelo CEP. Informe número e complemento, quando houver.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível consultar o CEP."); }
    finally { setLookingUp(null); }
  }

  async function saveCompany() {
    if (!supabase || !tenantId) return;
    const isPJ = company.personType !== "pf";
    if (isPJ && !company.legalName?.trim()) { setError("Informe a Razão Social."); return; }
    if (!company.document?.trim()) { setError(isPJ ? "Informe o CNPJ." : "Informe o CPF."); return; }
    setSaving(true); setError(null); setSuccess(null);
    try {
      const normalizedCompany = { ...company, legalName: company.legalName?.trim(), tradeName: company.tradeName?.trim(), document: company.document.trim(), email: company.email?.trim(), phone: company.phone?.trim(), cep: company.cep?.trim(), street: company.street?.trim(), number: company.number?.trim(), complement: company.complement?.trim(), neighborhood: company.neighborhood?.trim(), city: company.city?.trim(), state: company.state?.trim().toUpperCase() };
      const payload = { ...storedSettings, ...normalizedCompany };
      const { error: saveError } = await supabase.from("tenant_settings").upsert({ tenant_id: tenantId, settings: payload }, { onConflict: "tenant_id" });
      if (saveError) throw saveError;
      setStoredSettings(payload); setCompany(normalizedCompany); setSuccess("Dados da empresa salvos com sucesso.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar os dados da empresa."); }
    finally { setSaving(false); }
  }

  const isPF = company.personType === "pf";
  const standardFields: Array<{ key: keyof CompanyData; label: string; placeholder?: string; maxLength?: number }> = [
    { key: "legalName", label: isPF ? "Nome completo" : "Razão Social" }, { key: "tradeName", label: isPF ? "Nome de exibição" : "Nome Fantasia" },
    { key: "email", label: "E-mail" }, { key: "phone", label: "Telefone", placeholder: "+55 (13) 99999-9999" },
    { key: "street", label: "Endereço" }, { key: "number", label: "Número" }, { key: "complement", label: "Complemento" }, { key: "neighborhood", label: "Bairro" }, { key: "city", label: "Cidade" }, { key: "state", label: "Estado", placeholder: "SP", maxLength: 2 },
  ];

  return <div className="mx-auto w-full max-w-6xl space-y-6">
    <PageHeader eyebrow="Empresa" title={company.tradeName || tenant?.name || "Empresa"} description="Dados cadastrais, responsáveis e usuários vinculados à empresa atual." />
    {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
    {success && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">{success}</div>}
    <Tabs defaultValue="dados" className="space-y-4">
      <TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="dados">Dados da Empresa</TabsTrigger><TabsTrigger value="donos">Donos / Responsáveis</TabsTrigger><TabsTrigger value="usuarios">Usuários</TabsTrigger></TabsList>
      <TabsContent value="dados"><Card className="shadow-card"><CardHeader><CardTitle>Dados da Empresa</CardTitle></CardHeader><CardContent>
        {loading ? <div className="text-sm text-muted-foreground">Carregando dados da empresa...</div> : <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5"><span className="text-sm font-medium">Tipo de cadastro</span><select className={fieldClass} value={isPF ? "pf" : "pj"} onChange={(e) => setCompany((current) => ({ ...current, personType: e.target.value as "pj" | "pf", document: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" }))}><option value="pj">Pessoa Jurídica</option><option value="pf">Pessoa Física</option></select></label>
            <label className="space-y-1.5"><span className="text-sm font-medium">{isPF ? "CPF" : "CNPJ"}</span><div className="relative"><input className={`${fieldClass} pr-10`} inputMode="numeric" value={String(company.document ?? "")} placeholder={isPF ? "000.000.000-00" : "00.000.000/0000-00"} onChange={(e) => { const value = isPF ? maskCpf(e.target.value) : maskCnpj(e.target.value); change("document", value); if (!isPF && onlyDigits(value).length === 14) void lookupCnpj(value); }} />{lookingUp === "cnpj" ? <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" /> : !isPF ? <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /> : null}</div></label>
            {standardFields.slice(0, 4).map((field) => <label key={String(field.key)} className="space-y-1.5"><span className="text-sm font-medium">{field.label}</span><input className={fieldClass} value={String(company[field.key] ?? "")} placeholder={field.placeholder} maxLength={field.maxLength} onChange={(e) => change(field.key, field.key === "phone" ? maskPhone(e.target.value) : e.target.value)} /></label>)}
            <label className="space-y-1.5"><span className="text-sm font-medium">CEP</span><div className="relative"><input className={`${fieldClass} pr-10`} inputMode="numeric" value={String(company.cep ?? "")} onChange={(e) => { const value = maskCep(e.target.value); change("cep", value); if (isPF && onlyDigits(value).length === 8) void lookupCep(value); }} readOnly={!isPF} title={!isPF ? "Para Pessoa Jurídica, o CEP é preenchido pela consulta do CNPJ." : undefined} />{lookingUp === "cep" ? <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" /> : isPF ? <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /> : null}</div></label>
            {standardFields.slice(4).map((field) => <label key={String(field.key)} className="space-y-1.5"><span className="text-sm font-medium">{field.label}</span><input className={fieldClass} value={String(company[field.key] ?? "")} placeholder={field.placeholder} maxLength={field.maxLength} onChange={(e) => change(field.key, e.target.value)} /></label>)}
          </div>
          <div className="text-xs text-muted-foreground">{isPF ? "Para Pessoa Física, o CPF não é consultado. O endereço é preenchido pela consulta do CEP." : "Ao completar o CNPJ, os dados cadastrais e o endereço são consultados automaticamente. Não é feita consulta separada de CEP para Pessoa Jurídica."}</div>
          <div className="flex justify-end"><button type="button" disabled={saving || lookingUp !== null} onClick={() => void saveCompany()} className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50">{saving ? "Salvando..." : "Salvar alterações"}</button></div>
        </div>}
      </CardContent></Card></TabsContent>
      <TabsContent value="donos"><Card className="shadow-card"><CardHeader><CardTitle>Donos / Responsáveis</CardTitle></CardHeader><CardContent>{loading ? <div className="text-sm text-muted-foreground">Carregando responsáveis...</div> : owners.length === 0 ? <div className="text-sm text-muted-foreground">Não há responsáveis cadastrados para esta empresa.</div> : <div className="grid gap-3 md:grid-cols-2">{owners.map((owner) => <div key={owner.id} className="rounded-lg border bg-card p-4"><div className="text-base font-semibold">{owner.name}</div><div className="text-sm text-muted-foreground">{owner.function || "Responsável"}</div><div className="mt-3 space-y-1 text-sm"><div>{owner.phone || "—"}</div><div>{owner.email || "—"}</div></div></div>)}</div>}</CardContent></Card></TabsContent>
      <TabsContent value="usuarios"><Card className="shadow-card"><CardHeader><CardTitle>Usuários vinculados</CardTitle></CardHeader><CardContent>{loading ? <div className="text-sm text-muted-foreground">Carregando vínculos...</div> : users.length === 0 ? <div className="text-sm text-muted-foreground">Não há usuários vinculados a esta empresa.</div> : <div className="space-y-3">{users.map((user) => <div key={user.id} className="flex flex-col gap-2 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between"><div><div className="font-medium">{user.user_id}</div><div className="text-sm text-muted-foreground">{user.is_owner ? "Administrador / proprietário" : user.role || "Usuário"}</div></div><div className="text-sm text-muted-foreground">{user.status} · vínculo em {dateShort(user.created_at)}</div></div>)}</div>}</CardContent></Card></TabsContent>
    </Tabs>
  </div>;
}
