import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Crown,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components/app/ui-kit";
import {
  documentKind,
  maskCep,
  maskCnpj,
  maskCpf,
  maskPhone,
  onlyDigits,
  slugify,
} from "@/lib/br-format";
import { getSupabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant-context";

export const Route = createFileRoute("/app/super-admin")({
  head: () => ({
    meta: [
      { title: "Super Admin | Engenharia SaaS Modular" },
      {
        name: "description",
        content: "Painel do dono da plataforma para gerenciar empresas e módulos.",
      },
      { property: "og:title", content: "Super Admin | Engenharia SaaS Modular" },
      {
        property: "og:description",
        content: "Gestão de tenants, usuários, módulos e auditoria da plataforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuperAdminPage,
});

type AdminStats = {
  tenants_total: number;
  tenants_active: number;
  users_total: number;
  platform_admins_total: number;
  modules_total: number;
};

type AdminModule = {
  key: string;
  name: string;
  monthly_price: number | string;
  is_core: boolean;
  enabled?: boolean;
  enabled_at?: string | null;
};

type AdminUser = {
  id: string;
  user_id: string;
  email: string | null;
  is_owner: boolean;
  status: string;
  created_at: string;
};

type AdminAuditLog = {
  id: number;
  created_at: string;
  module_key: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details?: Record<string, unknown>;
};

type CompanyData = {
  personType?: "pj" | "pf";
  legalName?: string;
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
};

type OwnerContact = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  function: string;
};

type AdminTenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
  company_data?: CompanyData;
  owner_contacts?: OwnerContact[];
  users: AdminUser[];
  modules: AdminModule[];
  audit_logs: AdminAuditLog[];
};

type AdminOverview = {
  stats: AdminStats;
  modules: AdminModule[];
  tenants: AdminTenant[];
};

const money = (value: number | string) =>
  Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateTime = (value?: string | null) => (value ? new Date(value).toLocaleString("pt-BR") : "—");

const emptyOwner = (): OwnerContact => ({
  name: "",
  phone: "",
  email: "",
  function: "Proprietário",
});
const initialTenantForm = () => ({
  name: "",
  slug: "",
  ownerEmail: "",
  personType: "pj" as "pj" | "pf",
  legalName: "",
  document: "",
  email: "",
  phone: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  owners: [emptyOwner()],
  modules: [] as string[],
});

type TenantForm = ReturnType<typeof initialTenantForm>;

const ensureArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

function normalizeOverview(data: unknown): AdminOverview {
  const overview = (data ?? {}) as Partial<AdminOverview>;
  return {
    stats: {
      tenants_total: Number(overview.stats?.tenants_total ?? 0),
      tenants_active: Number(overview.stats?.tenants_active ?? 0),
      users_total: Number(overview.stats?.users_total ?? 0),
      platform_admins_total: Number(overview.stats?.platform_admins_total ?? 0),
      modules_total: Number(overview.stats?.modules_total ?? 0),
    },
    modules: ensureArray<AdminModule>(overview.modules),
    tenants: ensureArray<AdminTenant>(overview.tenants).map((tenant) => ({
      ...tenant,
      users: ensureArray<AdminUser>(tenant.users),
      modules: ensureArray<AdminModule>(tenant.modules),
      audit_logs: ensureArray<AdminAuditLog>(tenant.audit_logs),
      owner_contacts: ensureArray<OwnerContact>(tenant.owner_contacts),
      company_data:
        tenant.company_data && typeof tenant.company_data === "object" ? tenant.company_data : {},
    })),
  };
}

function SuperAdminPage() {
  const { isPlatformAdmin, status } = useTenant();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [userTenant, setUserTenant] = useState<AdminTenant | null>(null);
  const [tenantForm, setTenantForm] = useState<TenantForm>(() => initialTenantForm());
  const [userForm, setUserForm] = useState({ email: "", isOwner: false });

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("platform_admin_overview");
      if (rpcError) {
        setError(rpcError.message);
        setOverview(null);
      } else {
        setOverview(normalizeOverview(data));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Falha inesperada ao carregar empresas.");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!isPlatformAdmin) {
      setLoading(false);
      return;
    }
    void load();
  }, [isPlatformAdmin, load, status]);

  const tenants = useMemo(() => overview?.tenants ?? [], [overview?.tenants]);
  const optionalModules = useMemo(
    () => (overview?.modules ?? []).filter((mod) => !mod.is_core),
    [overview?.modules],
  );
  const monthlyTotal = useMemo(
    () =>
      tenants.reduce((sum, tenant) => {
        return (
          sum +
          tenant.modules.reduce(
            (tenantSum, mod) =>
              tenantSum + (mod.enabled && !mod.is_core ? Number(mod.monthly_price ?? 0) : 0),
            0,
          )
        );
      }, 0),
    [tenants],
  );

  function updateTenantForm<K extends keyof TenantForm>(key: K, value: TenantForm[K]) {
    setTenantForm((current) => ({ ...current, [key]: value }));
  }

  function updateOwner(index: number, field: keyof OwnerContact, value: string) {
    setTenantForm((current) => ({
      ...current,
      owners: current.owners.map((owner, ownerIndex) =>
        ownerIndex === index
          ? { ...owner, [field]: field === "phone" ? maskPhone(value) : value }
          : owner,
      ),
    }));
  }

  async function lookupCep(cepValue: string) {
    const digits = onlyDigits(cepValue);
    if (digits.length !== 8) return;
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`);
      if (!response.ok) throw new Error("CEP não localizado.");
      const data = (await response.json()) as {
        street?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
      };
      setTenantForm((current) => ({
        ...current,
        street: data.street ?? "",
        neighborhood: data.neighborhood ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
      }));
      toast.success("Endereço preenchido pelo CEP", {
        description: "Complete apenas número e complemento.",
      });
    } catch (error) {
      toast.error("Não foi possível buscar o CEP", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function lookupCnpj(documentValue: string) {
    const digits = onlyDigits(documentValue);
    if (digits.length !== 14) return;
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!response.ok) throw new Error("CNPJ não localizado na Receita/BrasilAPI.");
      const data = (await response.json()) as {
        razao_social?: string;
        nome_fantasia?: string;
        email?: string | null;
        ddd_telefone_1?: string | null;
        cep?: string | null;
        logradouro?: string | null;
        numero?: string | null;
        complemento?: string | null;
        bairro?: string | null;
        municipio?: string | null;
        uf?: string | null;
        qsa?: Array<{ nome_socio?: string; qualificacao_socio?: string }>;
      };
      const owners = (data.qsa ?? [])
        .slice(0, 8)
        .map((owner) => ({
          name: owner.nome_socio ?? "",
          phone: "",
          email: "",
          function: owner.qualificacao_socio ?? "Sócio/Proprietário",
        }))
        .filter((owner) => owner.name.trim());
      setTenantForm((current) => ({
        ...current,
        personType: "pj",
        name: data.nome_fantasia || data.razao_social || current.name,
        slug: current.slug || slugify(data.nome_fantasia || data.razao_social || current.name),
        legalName: data.razao_social ?? current.legalName,
        email: data.email ?? current.email,
        phone: maskPhone(data.ddd_telefone_1 ?? current.phone),
        cep: maskCep(data.cep ?? current.cep),
        street: data.logradouro ?? current.street,
        number: data.numero && data.numero !== "S/N" ? data.numero : current.number,
        complement: data.complemento ?? current.complement,
        neighborhood: data.bairro ?? current.neighborhood,
        city: data.municipio ?? current.city,
        state: data.uf ?? current.state,
        owners: owners.length ? owners : current.owners,
      }));
      toast.success("Dados da Receita preenchidos", {
        description: "Confira sócios, telefone, e-mail, número e complemento.",
      });
    } catch (error) {
      toast.error("Não foi possível buscar o CNPJ", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function setTenantModule(tenant: AdminTenant, mod: AdminModule, enabled: boolean) {
    if (mod.is_core) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const key = `${tenant.id}:${mod.key}`;
    setSavingKey(key);
    const previous = overview;
    setOverview((current) =>
      current
        ? {
            ...current,
            tenants: current.tenants.map((t) =>
              t.id === tenant.id
                ? {
                    ...t,
                    modules: t.modules.map((m) => (m.key === mod.key ? { ...m, enabled } : m)),
                  }
                : t,
            ),
          }
        : current,
    );

    const { error: rpcError } = await supabase.rpc("set_tenant_module", {
      _tenant: tenant.id,
      _module: mod.key,
      _enabled: enabled,
    });

    if (rpcError) {
      setOverview(previous);
      toast.error("Não foi possível alterar o módulo", { description: rpcError.message });
    } else {
      toast.success(enabled ? "Módulo liberado" : "Módulo bloqueado", {
        description: `${mod.name} — ${tenant.name}`,
      });
      await load();
    }
    setSavingKey(null);
  }

  async function createTenant() {
    const supabase = getSupabase();
    if (!supabase) return;
    const kind = documentKind(tenantForm.document);
    if (!tenantForm.name.trim() || !tenantForm.slug.trim() || !tenantForm.ownerEmail.trim()) {
      toast.error("Preencha empresa, slug e e-mail do dono.");
      return;
    }
    if (!kind) {
      toast.error("Informe CPF ou CNPJ completo.");
      return;
    }
    if (!tenantForm.cep.trim() || !tenantForm.number.trim()) {
      toast.error("Informe CEP e número do endereço.");
      return;
    }
    if (kind === "cnpj" && tenantForm.owners.filter((owner) => owner.name.trim()).length === 0) {
      toast.error("Informe pelo menos um proprietário/sócio do CNPJ.");
      return;
    }
    const companyData = {
      personType: tenantForm.personType,
      legalName:
        tenantForm.personType === "pj" ? tenantForm.legalName.trim() : tenantForm.name.trim(),
      document: tenantForm.document.trim(),
      email: tenantForm.email.trim(),
      phone: tenantForm.phone.trim(),
      cep: tenantForm.cep.trim(),
      street: tenantForm.street.trim(),
      number: tenantForm.number.trim(),
      complement: tenantForm.complement.trim(),
      neighborhood: tenantForm.neighborhood.trim(),
      city: tenantForm.city.trim(),
      state: tenantForm.state.trim().toUpperCase(),
      owners: kind === "cnpj" ? tenantForm.owners.filter((owner) => owner.name.trim()) : [],
    };
    setSavingKey("tenant:create");
    try {
      let { data: tenantId, error: rpcError } = await supabase.rpc("create_tenant", {
        _name: tenantForm.name.trim(),
        _slug: tenantForm.slug.trim(),
        _owner_email: tenantForm.ownerEmail.trim(),
        _modules: tenantForm.modules,
        _company_data: companyData,
      });

      const message = rpcError?.message ?? "";
      const missingCompanyDataRpc =
        rpcError &&
        (message.includes("_company_data") ||
          message.includes("Could not find the function") ||
          message.includes("PGRST202"));

      if (missingCompanyDataRpc) {
        const fallback = await supabase.rpc("create_tenant", {
          _name: tenantForm.name.trim(),
          _slug: tenantForm.slug.trim(),
          _owner_email: tenantForm.ownerEmail.trim(),
          _modules: tenantForm.modules,
        });
        tenantId = fallback.data;
        rpcError = fallback.error;
        if (!rpcError) {
          toast.warning("Empresa criada, mas o banco precisa da migration 0005", {
            description: "Dados completos/ proprietários serão gravados após aplicar a migration.",
          });
        }
      }

      if (rpcError) {
        toast.error("Não foi possível criar a empresa", { description: rpcError.message });
        return;
      }

      toast.success("Empresa criada", { description: tenantForm.name.trim() });
      if (!tenantId) {
        toast.info("Recarregando lista de empresas...");
      }
      setTenantForm(initialTenantForm());
      setCreateOpen(false);
      await load();
    } catch (error) {
      toast.error("Não foi possível criar a empresa", {
        description: error instanceof Error ? error.message : "Falha inesperada no cadastro.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function updateTenantStatus(tenant: AdminTenant, nextStatus: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    setSavingKey(`${tenant.id}:status`);
    const { error: rpcError } = await supabase.rpc("admin_update_tenant_status", {
      _tenant: tenant.id,
      _status: nextStatus,
    });
    setSavingKey(null);

    if (rpcError) {
      toast.error("Não foi possível alterar o status", { description: rpcError.message });
      return;
    }

    toast.success("Status atualizado", { description: `${tenant.name}: ${nextStatus}` });
    await load();
  }

  async function addTenantUser() {
    if (!userTenant) return;
    const supabase = getSupabase();
    if (!supabase) return;
    if (!userForm.email.trim()) {
      toast.error("Informe o e-mail do usuário.");
      return;
    }
    setSavingKey(`${userTenant.id}:user`);
    const { error: rpcError } = await supabase.rpc("admin_add_tenant_user", {
      _tenant: userTenant.id,
      _email: userForm.email.trim(),
      _is_owner: userForm.isOwner,
    });
    setSavingKey(null);

    if (rpcError) {
      toast.error("Não foi possível vincular usuário", { description: rpcError.message });
      return;
    }

    toast.success("Usuário vinculado", { description: userForm.email.trim() });
    setUserForm({ email: "", isOwner: false });
    setUserTenant(null);
    await load();
  }

  if (status === "loading") return <LoadingState label="Validando permissões..." />;

  if (!isPlatformAdmin) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Acesso restrito"
          title="Super Admin"
          description="Esta área é exclusiva para administradores da plataforma."
        />
        <Alert variant="destructive">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Acesso negado</AlertTitle>
          <AlertDescription>Seu usuário não está cadastrado em platform_admins.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Plataforma"
        title="Super Admin"
        description="Gestão central de empresas, donos, módulos contratados e auditoria. Alterações aqui são gravadas no Supabase e passam pelas regras de platform_admin."
        actions={
          <>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nova empresa
            </Button>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Atualizar
            </Button>
          </>
        }
      />

      {error && (
        <Alert variant="destructive">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Erro ao carregar painel</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !overview ? <LoadingState label="Carregando empresas e módulos..." /> : null}

      {overview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Empresas"
              value={String(overview.stats.tenants_total)}
              hint={`${overview.stats.tenants_active} ativas`}
              icon={Building2}
            />
            <StatCard
              label="Usuários ativos"
              value={String(overview.stats.users_total)}
              hint="Vínculos tenant_users"
              icon={Users}
            />
            <StatCard
              label="Super admins"
              value={String(overview.stats.platform_admins_total)}
              hint="platform_admins"
              icon={Crown}
            />
            <StatCard
              label="Módulos catálogo"
              value={String(overview.stats.modules_total)}
              hint="subscription_modules"
              icon={ShieldCheck}
            />
            <StatCard
              label="MRR módulos"
              value={money(monthlyTotal)}
              hint="Soma dos módulos ativos"
              icon={WalletCards}
            />
          </div>

          {tenants.length === 0 ? (
            <EmptyState
              title="Nenhuma empresa cadastrada"
              description="Clique em Nova empresa para cadastrar o primeiro cliente."
              action={<Button onClick={() => setCreateOpen(true)}>Nova empresa</Button>}
            />
          ) : (
            <div className="space-y-5">
              {tenants.map((tenant) => {
                const enabledModules = tenant.modules.filter((m) => m.enabled).length;
                const owners = tenant.users.filter((u) => u.is_owner);
                const statusSaving = savingKey === `${tenant.id}:status`;
                const nextStatus = tenant.status === "ativo" ? "bloqueado" : "ativo";
                return (
                  <Card key={tenant.id} className="shadow-card">
                    <CardHeader className="gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle>{tenant.name}</CardTitle>
                          <StatusBadge status={tenant.status} />
                          <Badge variant="secondary">{tenant.slug}</Badge>
                        </div>
                        <CardDescription>
                          {enabledModules} de {tenant.modules.length} módulos ativos ·{" "}
                          {tenant.users.length} usuário(s) · criado em {dateTime(tenant.created_at)}
                        </CardDescription>
                        {tenant.company_data?.document ? (
                          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                            <span>
                              <strong>Documento:</strong> {tenant.company_data.document}
                            </span>
                            <span>
                              <strong>Telefone:</strong> {tenant.company_data.phone || "—"}
                            </span>
                            <span>
                              <strong>CEP:</strong> {tenant.company_data.cep || "—"}
                            </span>
                            <span>
                              <strong>Cidade/UF:</strong>{" "}
                              {[tenant.company_data.city, tenant.company_data.state]
                                .filter(Boolean)
                                .join("/") || "—"}
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setUserTenant(tenant)}>
                          <UserPlus className="mr-2 h-4 w-4" /> Vincular usuário
                        </Button>
                        <Button
                          variant={nextStatus === "ativo" ? "default" : "destructive"}
                          size="sm"
                          disabled={statusSaving}
                          onClick={() => void updateTenantStatus(tenant, nextStatus)}
                        >
                          {statusSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Power className="mr-2 h-4 w-4" />
                          )}
                          {nextStatus === "ativo" ? "Reativar" : "Bloquear"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                        <p className="font-medium">Dono(s) do acesso</p>
                        <p className="text-muted-foreground">
                          {owners.map((u) => u.email ?? u.user_id).join(", ") || "Sem dono ativo"}
                        </p>
                        {tenant.owner_contacts?.length ? (
                          <div className="mt-3 space-y-1 border-t pt-2">
                            <p className="font-medium">Proprietários / sócios</p>
                            {tenant.owner_contacts.map((owner) => (
                              <p
                                key={owner.id ?? `${owner.name}-${owner.email}`}
                                className="text-xs text-muted-foreground"
                              >
                                {owner.name} · {owner.function || "Função não informada"} ·{" "}
                                {owner.phone || "sem telefone"} · {owner.email || "sem e-mail"}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <p className="mb-3 text-sm font-semibold">Módulos contratados</p>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {tenant.modules.map((mod) => {
                            const saving = savingKey === `${tenant.id}:${mod.key}`;
                            return (
                              <div
                                key={mod.key}
                                className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-sm font-semibold">{mod.name}</p>
                                    {mod.is_core && <Badge variant="secondary">Base</Badge>}
                                    {mod.enabled ? (
                                      <Badge className="bg-success text-success-foreground">
                                        Ativo
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">Bloqueado</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {mod.is_core ? "Incluso" : `${money(mod.monthly_price)}/mês`} ·{" "}
                                    {mod.enabled_at
                                      ? `liberado em ${dateTime(mod.enabled_at)}`
                                      : "sem liberação registrada"}
                                  </p>
                                </div>
                                {saving ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                  <Switch
                                    checked={Boolean(mod.enabled)}
                                    disabled={mod.is_core || Boolean(savingKey)}
                                    onCheckedChange={(checked) =>
                                      void setTenantModule(tenant, mod, checked)
                                    }
                                    aria-label={`${mod.enabled ? "Bloquear" : "Liberar"} módulo ${mod.name}`}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <p className="mb-3 text-sm font-semibold">Usuários vinculados</p>
                          <div className="space-y-2">
                            {tenant.users.map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium">
                                    {user.email ?? user.user_id}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{user.user_id}</p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                  {user.is_owner && <Badge>Dono</Badge>}
                                  <StatusBadge status={user.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="mb-3 text-sm font-semibold">Auditoria recente</p>
                          <div className="space-y-2">
                            {tenant.audit_logs.length ? (
                              tenant.audit_logs.map((log) => (
                                <div
                                  key={log.id}
                                  className="rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-medium">{log.action}</p>
                                    <span className="text-xs text-muted-foreground">
                                      {dateTime(log.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {log.module_key ?? "plataforma"} · {log.entity ?? "registro"}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                                Sem auditoria recente.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova empresa cliente</DialogTitle>
            <DialogDescription>
              O e-mail do dono precisa existir no Supabase Auth. O sistema vincula o dono, cria a
              empresa e libera os módulos selecionados.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-2 pr-1">
            <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  checked={tenantForm.personType === "pj"}
                  onChange={() => updateTenantForm("personType", "pj")}
                />
                Pessoa jurídica / CNPJ
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  checked={tenantForm.personType === "pf"}
                  onChange={() => updateTenantForm("personType", "pf")}
                />
                Pessoa física / CPF
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="tenant-document">
                  {tenantForm.personType === "pj" ? "CNPJ" : "CPF"}
                </Label>
                <Input
                  id="tenant-document"
                  value={tenantForm.document}
                  inputMode="numeric"
                  onChange={(event) => {
                    const document =
                      tenantForm.personType === "pj"
                        ? maskCnpj(event.target.value)
                        : maskCpf(event.target.value);
                    setTenantForm((current) => ({ ...current, document }));
                    if (onlyDigits(document).length === 14) void lookupCnpj(document);
                  }}
                  placeholder={
                    tenantForm.personType === "pj" ? "00.000.000/0000-00" : "000.000.000-00"
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenant-name">
                  {tenantForm.personType === "pj" ? "Nome fantasia" : "Nome completo"}
                </Label>
                <Input
                  id="tenant-name"
                  value={tenantForm.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setTenantForm((current) => ({
                      ...current,
                      name,
                      slug: current.slug ? current.slug : slugify(name),
                    }));
                  }}
                  placeholder="Ex.: Cliente Engenharia LTDA"
                />
              </div>
              {tenantForm.personType === "pj" ? (
                <div className="grid gap-2">
                  <Label htmlFor="tenant-legal-name">Razão social</Label>
                  <Input
                    id="tenant-legal-name"
                    value={tenantForm.legalName}
                    onChange={(event) => updateTenantForm("legalName", event.target.value)}
                  />
                </div>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="tenant-slug">Slug</Label>
                <Input
                  id="tenant-slug"
                  value={tenantForm.slug}
                  onChange={(event) => updateTenantForm("slug", slugify(event.target.value))}
                  placeholder="cliente-engenharia"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenant-email">E-mail da empresa</Label>
                <Input
                  id="tenant-email"
                  type="email"
                  value={tenantForm.email}
                  onChange={(event) => updateTenantForm("email", event.target.value)}
                  placeholder="contato@cliente.com.br"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenant-phone">Telefone</Label>
                <Input
                  id="tenant-phone"
                  value={tenantForm.phone}
                  inputMode="tel"
                  onChange={(event) => updateTenantForm("phone", maskPhone(event.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenant-owner">E-mail do dono do acesso</Label>
                <Input
                  id="tenant-owner"
                  type="email"
                  value={tenantForm.ownerEmail}
                  onChange={(event) => updateTenantForm("ownerEmail", event.target.value)}
                  placeholder="dono@cliente.com.br"
                />
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-sm font-semibold">Endereço</p>
              <p className="text-xs text-muted-foreground">
                Digite o CEP para preencher rua, bairro, cidade e UF. Preencha manualmente apenas
                número e complemento.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="tenant-cep">CEP</Label>
                  <Input
                    id="tenant-cep"
                    value={tenantForm.cep}
                    inputMode="numeric"
                    onChange={(event) => {
                      const cep = maskCep(event.target.value);
                      updateTenantForm("cep", cep);
                      if (onlyDigits(cep).length === 8) void lookupCep(cep);
                    }}
                    placeholder="00000-000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tenant-number">Número</Label>
                  <Input
                    id="tenant-number"
                    value={tenantForm.number}
                    onChange={(event) => updateTenantForm("number", event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tenant-street">Rua / logradouro</Label>
                  <Input
                    id="tenant-street"
                    value={tenantForm.street}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tenant-neighborhood">Bairro</Label>
                  <Input
                    id="tenant-neighborhood"
                    value={tenantForm.neighborhood}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tenant-city">Cidade</Label>
                  <Input id="tenant-city" value={tenantForm.city} readOnly className="bg-muted" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tenant-state">UF</Label>
                  <Input id="tenant-state" value={tenantForm.state} readOnly className="bg-muted" />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="tenant-complement">Complemento</Label>
                  <Input
                    id="tenant-complement"
                    value={tenantForm.complement}
                    onChange={(event) => updateTenantForm("complement", event.target.value)}
                  />
                </div>
              </div>
            </div>

            {tenantForm.personType === "pj" ? (
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Proprietários / sócios</p>
                    <p className="text-xs text-muted-foreground">
                      Nome e função podem vir da Receita; confirme telefone e e-mail.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setTenantForm((current) => ({
                        ...current,
                        owners: [...current.owners, emptyOwner()],
                      }))
                    }
                  >
                    Adicionar
                  </Button>
                </div>
                <div className="mt-3 space-y-3">
                  {tenantForm.owners.map((owner, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2"
                    >
                      <Input
                        value={owner.name}
                        onChange={(event) => updateOwner(index, "name", event.target.value)}
                        placeholder="Nome"
                      />
                      <Input
                        value={owner.function}
                        onChange={(event) => updateOwner(index, "function", event.target.value)}
                        placeholder="Função"
                      />
                      <Input
                        value={owner.phone}
                        onChange={(event) => updateOwner(index, "phone", event.target.value)}
                        placeholder="Telefone"
                      />
                      <Input
                        type="email"
                        value={owner.email}
                        onChange={(event) => updateOwner(index, "email", event.target.value)}
                        placeholder="E-mail"
                      />
                      {tenantForm.owners.length > 1 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() =>
                            setTenantForm((current) => ({
                              ...current,
                              owners: current.owners.filter(
                                (_, ownerIndex) => ownerIndex !== index,
                              ),
                            }))
                          }
                        >
                          Remover
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label>Módulos contratados</Label>
              <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
                {optionalModules.map((mod) => (
                  <label key={mod.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={tenantForm.modules.includes(mod.key)}
                      onChange={(event) =>
                        setTenantForm((current) => ({
                          ...current,
                          modules: event.target.checked
                            ? [...current.modules, mod.key]
                            : current.modules.filter((key) => key !== mod.key),
                        }))
                      }
                    />
                    <span>{mod.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {money(mod.monthly_price)}/mês
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void createTenant()} disabled={savingKey === "tenant:create"}>
              {savingKey === "tenant:create" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(userTenant)} onOpenChange={(open) => !open && setUserTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular usuário</DialogTitle>
            <DialogDescription>
              Empresa: {userTenant?.name}. O usuário precisa existir no Supabase Auth antes do
              vínculo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="tenant-user-email">E-mail do usuário</Label>
              <Input
                id="tenant-user-email"
                type="email"
                value={userForm.email}
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="usuario@cliente.com.br"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={userForm.isOwner}
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, isOwner: event.target.checked }))
                }
              />
              Definir como dono da empresa
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserTenant(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void addTenantUser()}
              disabled={savingKey === `${userTenant?.id}:user`}
            >
              {savingKey === `${userTenant?.id}:user` && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Vincular usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
