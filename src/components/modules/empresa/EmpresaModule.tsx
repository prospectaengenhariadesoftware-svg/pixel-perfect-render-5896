import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/ui-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSupabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant-context";

type CompanyData = {
  personType?: "pj" | "pf";
  legalName?: string;
  tradeName?: string;
  document?: string;
  email?: string;
  phone?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  [key: string]: unknown;
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
        const stored = settings?.settings && typeof settings.settings === "object" && !Array.isArray(settings.settings)
          ? (settings.settings as Record<string, unknown>)
          : {};
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
    void loadCompanyArea();
    return () => { cancelled = true; };
  }, [supabase, tenantId, tenantStatus, tenant?.name]);

  function change(field: keyof CompanyData, value: string) { setCompany((current) => ({ ...current, [field]: value })); setSuccess(null); }

  async function saveCompany() {
    if (!supabase || !tenantId) return;
    const isPJ = company.personType !== "pf";
    if (isPJ && !company.legalName?.trim()) { setError("Informe a Razão Social."); return; }
    if (!company.document?.trim()) { setError(isPJ ? "Informe o CNPJ." : "Informe o CPF."); return; }
    setSaving(true); setError(null); setSuccess(null);
    try {
      const normalizedCompany = {
        ...company,
        legalName: company.legalName?.trim(),
        tradeName: company.tradeName?.trim(),
        document: company.document.trim(),
        email: company.email?.trim(),
        phone: company.phone?.trim(),
        cep: company.cep?.trim(),
        street: company.street?.trim(),
        number: company.number?.trim(),
        complement: company.complement?.trim(),
        neighborhood: company.neighborhood?.trim(),
        city: company.city?.trim(),
        state: company.state?.trim().toUpperCase(),
      };
      const payload = { ...storedSettings, ...normalizedCompany };
      const { error: saveError } = await supabase.from("tenant_settings").upsert({ tenant_id: tenantId, settings: payload }, { onConflict: "tenant_id" });
      if (saveError) throw saveError;
      setStoredSettings(payload);
      setCompany(normalizedCompany);
      setSuccess("Dados da empresa salvos com sucesso.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar os dados da empresa."); }
    finally { setSaving(false); }
  }

  const fields: Array<{ key: keyof CompanyData; label: string; placeholder?: string; maxLength?: number }> = [
    { key: "document", label: company.personType === "pf" ? "CPF" : "CNPJ", placeholder: company.personType === "pf" ? "000.000.000-00" : "00.000.000/0000-00" },
    { key: "legalName", label: company.personType === "pf" ? "Nome completo" : "Razão Social" },
    { key: "tradeName", label: company.personType === "pf" ? "Nome de exibição" : "Nome Fantasia" },
    { key: "email", label: "E-mail" },
    { key: "phone", label: "Telefone", placeholder: "+55 (13) 99999-9999" },
    { key: "cep", label: "CEP" },
    { key: "street", label: "Endereço" },
    { key: "number", label: "Número" },
    { key: "complement", label: "Complemento" },
    { key: "neighborhood", label: "Bairro" },
    { key: "city", label: "Cidade" },
    { key: "state", label: "Estado", placeholder: "SP", maxLength: 2 },
  ];

  return <div className="mx-auto w-full max-w-6xl space-y-6">
    <PageHeader eyebrow="Empresa" title={company.tradeName || tenant?.name || "Empresa"} description="Dados cadastrais, responsáveis e usuários vinculados à empresa atual." />
    {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
    {success && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">{success}</div>}
    <Tabs defaultValue="dados" className="space-y-4">
      <TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="dados">Dados da Empresa</TabsTrigger><TabsTrigger value="donos">Donos / Responsáveis</TabsTrigger><TabsTrigger value="usuarios">Usuários</TabsTrigger></TabsList>
      <TabsContent value="dados"><Card className="shadow-card"><CardHeader><CardTitle>Dados da Empresa</CardTitle></CardHeader><CardContent>
        {loading ? <div className="text-sm text-muted-foreground">Carregando dados da empresa...</div> : <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">{fields.map((field) => <label key={String(field.key)} className="space-y-1.5"><span className="text-sm font-medium">{field.label}</span><input className={fieldClass} value={String(company[field.key] ?? "")} placeholder={field.placeholder} maxLength={field.maxLength} onChange={(e) => change(field.key, e.target.value)} /></label>)}</div>
          <div className="flex justify-end"><button type="button" disabled={saving} onClick={() => void saveCompany()} className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50">{saving ? "Salvando..." : "Salvar alterações"}</button></div>
        </div>}
      </CardContent></Card></TabsContent>
      <TabsContent value="donos"><Card className="shadow-card"><CardHeader><CardTitle>Donos / Responsáveis</CardTitle></CardHeader><CardContent>{loading ? <div className="text-sm text-muted-foreground">Carregando responsáveis...</div> : owners.length === 0 ? <div className="text-sm text-muted-foreground">Não há responsáveis cadastrados para esta empresa.</div> : <div className="grid gap-3 md:grid-cols-2">{owners.map((owner) => <div key={owner.id} className="rounded-lg border bg-card p-4"><div className="text-base font-semibold">{owner.name}</div><div className="text-sm text-muted-foreground">{owner.function || "Responsável"}</div><div className="mt-3 space-y-1 text-sm"><div>{owner.phone || "—"}</div><div>{owner.email || "—"}</div></div></div>)}</div>}</CardContent></Card></TabsContent>
      <TabsContent value="usuarios"><Card className="shadow-card"><CardHeader><CardTitle>Usuários vinculados</CardTitle></CardHeader><CardContent>{loading ? <div className="text-sm text-muted-foreground">Carregando vínculos...</div> : users.length === 0 ? <div className="text-sm text-muted-foreground">Não há usuários vinculados a esta empresa.</div> : <div className="space-y-3">{users.map((user) => <div key={user.id} className="flex flex-col gap-2 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between"><div><div className="font-medium">{user.user_id}</div><div className="text-sm text-muted-foreground">{user.is_owner ? "Administrador / proprietário" : user.role || "Usuário"}</div></div><div className="text-sm text-muted-foreground">{user.status} · vínculo em {dateShort(user.created_at)}</div></div>)}</div>}</CardContent></Card></TabsContent>
    </Tabs>
  </div>;
}
