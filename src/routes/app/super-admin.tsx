import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CalendarDays,
  Crown,
  Edit3,
  Loader2,
  MapPin,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
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

type StatusFilter = "todas" | "ativo" | "bloqueado";

const money = (value: number | string) =>
  Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateTime = (value?: string | null) => (value ? new Date(value).toLocaleString("pt-BR") : "—");
const dateShort = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "—";
const compact = (values: Array<string | null | undefined>, fallback = "—") =>
  values
    .map((value) => value?.trim())
    .filter(Boolean)
    .join("/") || fallback;

const emptyOwner = (): OwnerContact => ({
  name: "",
  phone: "",
  email: "",
  function: "Proprietário",
});

const initialTenantForm = () => ({
  name: "",
  slug: "",
  status: "ativo",
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

function enabledModules(tenant: AdminTenant) {
  return tenant.modules.filter((mod) => mod.enabled).length;
}

function tenantMonthlyTotal(tenant: AdminTenant) {
  return tenant.modules.reduce(
    (sum, mod) => sum + (mod.enabled && !mod.is_core ? Number(mod.monthly_price ?? 0) : 0),
    0,
  );
}

function ownerContactsFromTenant(tenant: AdminTenant) {
  const owners = ensureArray<OwnerContact>(tenant.owner_contacts).filter((owner) =>
    owner.name.trim(),
  );
  return owners.length ? owners : [emptyOwner()];
}

function tenantToForm(tenant: AdminTenant): TenantForm {
  const company = tenant.company_data ?? {};
  return {
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    ownerEmail: tenant.users.find((user) => user.is_owner)?.email ?? "",
    personType:
      company.personType ?? (onlyDigits(company.document ?? "").length === 11 ? "pf" : "pj"),
    legalName: company.legalName ?? "",
    document: company.document ?? "",
    email: company.email ?? "",
    phone: company.phone ?? "",
    cep: company.cep ?? "",
    street: company.street ?? "",
    number: company.number ?? "",
    complement: company.complement ?? "",
    neighborhood: company.neighborhood ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    owners: ownerContactsFromTenant(tenant),
    modules: tenant.modules.filter((mod) => mod.enabled && !mod.is_core).map((mod) => mod.key),
  };
}

function companyDataFromForm(form: TenantForm) {
  const owners = form.owners
    .filter((owner) => owner.name.trim())
    .map((owner) => ({
      name: owner.name.trim(),
      phone: owner.phone.trim(),
      email: owner.email.trim(),
      function: owner.function.trim() || "Proprietário",
    }));

  return {
    personType: form.personType,
    legalName: form.personType === "pj" ? form.legalName.trim() : form.name.trim(),
    document: form.document.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    cep: form.cep.trim(),
    street: form.street.trim(),
    number: form.number.trim(),
    complement: form.complement.trim(),
    neighborhood: form.neighborhood.trim(),
    city: form.city.trim(),
    state: form.state.trim().toUpperCase(),
    owners,
  };
}

function validateTenantForm(form: TenantForm, requireAccessOwner: boolean) {
  const kind = documentKind(form.document);
  const ownerContacts = form.owners.filter((owner) => owner.name.trim());
  const accessOwner = ownerContacts.find((owner) => owner.email.trim());

  if (!form.name.trim() || !form.slug.trim()) return "Preencha empresa e slug.";
  if (!kind) return "Informe CPF ou CNPJ completo.";
  if (!form.cep.trim() || !form.number.trim()) return "Informe CEP e número do endereço.";
  if (ownerContacts.length === 0) return "Informe pelo menos um proprietário/responsável.";
  if (requireAccessOwner && !accessOwner) {
    return "Informe o e-mail de pelo menos um proprietário/sócio para ser o dono do acesso.";
  }
  return null;
}

function SuperAdminPage() {
  const { isPlatformAdmin, status } = useTenant();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [editTenantId, setEditTenantId] = useState<string | null>(null);
  const [userTenant, setUserTenant] = useState<AdminTenant | null>(null);
  const [tenantForm, setTenantForm] = useState<TenantForm>(() => initialTenantForm());
  const [editForm, setEditForm] = useState<TenantForm>(() => initialTenantForm());
  const [userForm, setUserForm] = useState({ email: "", isOwner: false });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");

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
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Falha inesperada ao carregar empresas.",
      );
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
  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) ?? null,
    [selectedTenantId, tenants],
  );
  const editTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === editTenantId) ?? null,
    [editTenantId, tenants],
  );
  const optionalModules = useMemo(
    () => (overview?.modules ?? []).filter((mod) => !mod.is_core),
    [overview?.modules],
  );
  const monthlyTotal = useMemo(
    () => tenants.reduce((sum, tenant) => sum + tenantMonthlyTotal(tenant), 0),
    [tenants],
  );
  const filteredTenants = useMemo(() => {
    const query = onlyDigits(searchQuery) || searchQuery.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const company = tenant.company_data ?? {};
      const statusMatches =
        statusFilter === "todas" ||
        tenant.status === statusFilter ||
        (statusFilter === "bloqueado" && tenant.status === "inativo");
      if (!statusMatches) return false;
      if (!query) return true;
      const haystack = [
        tenant.name,
        tenant.slug,
        company.legalName,
        company.document,
        company.city,
        company.state,
      ]
        .join(" ")
        .toLowerCase();
      const documentDigits = onlyDigits(company.document ?? "");
      return haystack.includes(query) || documentDigits.includes(query);
    });
  }, [searchQuery, statusFilter, tenants]);

  function openCreateDialog() {
    setTenantForm(initialTenantForm());
    setCreateOpen(true);
  }

  function openEditDialog(tenant: AdminTenant) {
    setEditTenantId(tenant.id);
    setEditForm(tenantToForm(tenant));
    setEditOpen(true);
  }

  function updateTenantForm<K extends keyof TenantForm>(key: K, value: TenantForm[K]) {
    setTenantForm((current) => ({ ...current, [key]: value }));
  }

  function updateEditForm<K extends keyof TenantForm>(key: K, value: TenantForm[K]) {
    setEditForm((current) => ({ ...current, [key]: value }));
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

  function updateEditOwner(index: number, field: keyof OwnerContact, value: string) {
    setEditForm((current) => ({
      ...current,
      owners: current.owners.map((owner, ownerIndex) =>
        ownerIndex === index
          ? { ...owner, [field]: field === "phone" ? maskPhone(value) : value }
          : owner,
      ),
    }));
  }

  async function lookupCep(cepValue: string, target: "create" | "edit" = "create") {
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
      const updater = target === "create" ? setTenantForm : setEditForm;
      updater((current) => ({
        ...current,
        street: data.street ?? "",
        neighborhood: data.neighborhood ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
      }));
      toast.success("Endereço preenchido pelo CEP", {
        description: "Complete apenas número e complemento.",
      });
    } catch (lookupError) {
      toast.error("Não foi possível buscar o CEP", {
        description: lookupError instanceof Error ? lookupError.message : undefined,
      });
    }
  }

  async function lookupCnpj(documentValue: string, target: "create" | "edit" = "create") {
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
      const updater = target === "create" ? setTenantForm : setEditForm;
      updater((current) => ({
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
    } catch (lookupError) {
      toast.error("Não foi possível buscar o CNPJ", {
        description: lookupError instanceof Error ? lookupError.message : undefined,
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
    const validation = validateTenantForm(tenantForm, true);
    if (validation) {
      toast.error(validation);
      return;
    }
    const ownerContacts = tenantForm.owners.filter((owner) => owner.name.trim());
    const accessOwner = ownerContacts.find((owner) => owner.email.trim());
    const companyData = companyDataFromForm(tenantForm);
    setSavingKey("tenant:create");
    try {
      let { data: tenantId, error: rpcError } = await supabase.rpc("create_tenant", {
        _name: tenantForm.name.trim(),
        _slug: tenantForm.slug.trim(),
        _owner_email: accessOwner?.email.trim() ?? "",
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
          _owner_email: accessOwner?.email.trim() ?? "",
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
      if (!tenantId) toast.info("Recarregando lista de empresas...");
      setTenantForm(initialTenantForm());
      setCreateOpen(false);
      await load();
    } catch (createError) {
      toast.error("Não foi possível criar a empresa", {
        description:
          createError instanceof Error ? createError.message : "Falha inesperada no cadastro.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function updateTenant() {
    if (!editTenant) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const validation = validateTenantForm(editForm, false);
    if (validation) {
      toast.error(validation);
      return;
    }
    const companyData = companyDataFromForm(editForm);
    setSavingKey(`${editTenant.id}:edit`);
    try {
      const { error: updateError } = await supabase.rpc("admin_update_tenant", {
        _tenant: editTenant.id,
        _name: editForm.name.trim(),
        _slug: editForm.slug.trim(),
        _status: editForm.status,
        _company_data: companyData,
      });
      if (updateError) {
        toast.error("Não foi possível editar a empresa", { description: updateError.message });
        return;
      }
      const { error: ownersError } = await supabase.rpc("admin_save_tenant_owner_contacts", {
        _tenant: editTenant.id,
        _owners: companyData.owners,
      });
      if (ownersError) {
        toast.error("Empresa salva, mas responsáveis não foram atualizados", {
          description: ownersError.message,
        });
        return;
      }
      toast.success("Empresa atualizada", { description: editForm.name.trim() });
      setEditOpen(false);
      setEditTenantId(null);
      await load();
    } catch (updateError) {
      toast.error("Não foi possível editar a empresa", {
        description: updateError instanceof Error ? updateError.message : "Falha inesperada.",
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

  async function archiveTenant(tenant: AdminTenant) {
    const supabase = getSupabase();
    if (!supabase) return;
    const typed = window.prompt(
      `Para confirmar a exclusão segura, digite exatamente o nome da empresa: ${tenant.name}\n\nA empresa será INATIVADA, não apagada fisicamente.`,
    );
    if (typed !== tenant.name) {
      toast.info("Exclusão cancelada", { description: "A confirmação digitada não confere." });
      return;
    }
    setSavingKey(`${tenant.id}:archive`);
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_archive_tenant", {
        _tenant: tenant.id,
      });
      if (rpcError) {
        toast.error("Não foi possível excluir/inativar a empresa", {
          description: rpcError.message,
        });
        return;
      }
      const result = data as { reason?: string } | null;
      toast.success("Empresa inativada com segurança", {
        description:
          result?.reason ?? "Exclusão física bloqueada para preservar vínculos e auditoria.",
      });
      setSelectedTenantId(null);
      await load();
    } catch (archiveError) {
      toast.error("Não foi possível excluir/inativar a empresa", {
        description: archiveError instanceof Error ? archiveError.message : "Falha inesperada.",
      });
    } finally {
      setSavingKey(null);
    }
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
        description="Gestão central de empresas/tenants, usuários, módulos contratados e responsáveis. Todas as alterações passam por RPCs protegidas por platform_admin."
        actions={
          <>
            <Button onClick={openCreateDialog}>
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

          <Card>
            <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar empresa por nome, razão social, nome fantasia ou CNPJ..."
                  className="pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                aria-label="Filtrar empresas por status"
              >
                <option value="todas">Todas</option>
                <option value="ativo">Ativas</option>
                <option value="bloqueado">Bloqueadas/Inativas</option>
              </select>
            </CardContent>
          </Card>

          {filteredTenants.length === 0 ? (
            <EmptyState
              title={
                tenants.length === 0 ? "Nenhuma empresa cadastrada" : "Nenhuma empresa encontrada"
              }
              description={
                tenants.length === 0
                  ? "Clique em Nova empresa para cadastrar o primeiro cliente."
                  : "Ajuste a busca ou o filtro de status."
              }
              action={<Button onClick={openCreateDialog}>Nova empresa</Button>}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredTenants.map((tenant) => {
                const company = tenant.company_data ?? {};
                const enabledCount = enabledModules(tenant);
                const activePrice = tenantMonthlyTotal(tenant);
                return (
                  <Card
                    key={tenant.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
                    onClick={() => setSelectedTenantId(tenant.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ")
                        setSelectedTenantId(tenant.id);
                    }}
                  >
                    <CardHeader className="space-y-3 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-lg">{tenant.name}</CardTitle>
                          <CardDescription className="truncate">
                            {company.legalName || tenant.slug}
                          </CardDescription>
                        </div>
                        <StatusBadge status={tenant.status} />
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>{company.document || "Documento não informado"}</p>
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {compact([company.city, company.state])}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                        <span>{tenant.users.length} usuário(s)</span>
                        <span>
                          {enabledCount}/{tenant.modules.length} módulos
                        </span>
                        <span className="col-span-2">{money(activePrice)}/mês</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {dateShort(tenant.created_at)}
                        </span>
                        <span>Clique para gerenciar</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      <TenantFormDialog
        title="Nova empresa cliente"
        description="O sistema cria a empresa, grava os dados completos e usa o e-mail informado em Proprietários / sócios como dono do primeiro acesso."
        open={createOpen}
        onOpenChange={setCreateOpen}
        form={tenantForm}
        optionalModules={optionalModules}
        saving={savingKey === "tenant:create"}
        submitLabel="Criar empresa"
        onSubmit={() => void createTenant()}
        updateForm={updateTenantForm}
        updateOwner={updateOwner}
        addOwner={() =>
          setTenantForm((current) => ({ ...current, owners: [...current.owners, emptyOwner()] }))
        }
        removeOwner={(index) =>
          setTenantForm((current) => ({
            ...current,
            owners: current.owners.filter((_, ownerIndex) => ownerIndex !== index),
          }))
        }
        lookupCep={(cep) => void lookupCep(cep, "create")}
        lookupCnpj={(document) => void lookupCnpj(document, "create")}
        showStatus={false}
      />

      <TenantFormDialog
        title="Editar empresa"
        description={`Atualize dados cadastrais e responsáveis de ${editTenant?.name ?? "empresa"}.`}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditTenantId(null);
        }}
        form={editForm}
        optionalModules={optionalModules}
        saving={Boolean(editTenant && savingKey === `${editTenant.id}:edit`)}
        submitLabel="Salvar alterações"
        onSubmit={() => void updateTenant()}
        updateForm={updateEditForm}
        updateOwner={updateEditOwner}
        addOwner={() =>
          setEditForm((current) => ({ ...current, owners: [...current.owners, emptyOwner()] }))
        }
        removeOwner={(index) =>
          setEditForm((current) => ({
            ...current,
            owners: current.owners.filter((_, ownerIndex) => ownerIndex !== index),
          }))
        }
        lookupCep={(cep) => void lookupCep(cep, "edit")}
        lookupCnpj={(document) => void lookupCnpj(document, "edit")}
        showStatus
      />

      <Dialog
        open={Boolean(selectedTenant)}
        onOpenChange={(open) => !open && setSelectedTenantId(null)}
      >
        <DialogContent className="max-w-5xl">
          {selectedTenant ? (
            <TenantDetail
              tenant={selectedTenant}
              savingKey={savingKey}
              onEdit={() => openEditDialog(selectedTenant)}
              onArchive={() => void archiveTenant(selectedTenant)}
              onSetStatus={(nextStatus) => void updateTenantStatus(selectedTenant, nextStatus)}
              onSetModule={(mod, enabled) => void setTenantModule(selectedTenant, mod, enabled)}
              onAddUser={() => setUserTenant(selectedTenant)}
            />
          ) : null}
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

type TenantFormDialogProps = {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: TenantForm;
  optionalModules: AdminModule[];
  saving: boolean;
  submitLabel: string;
  onSubmit: () => void;
  updateForm: <K extends keyof TenantForm>(key: K, value: TenantForm[K]) => void;
  updateOwner: (index: number, field: keyof OwnerContact, value: string) => void;
  addOwner: () => void;
  removeOwner: (index: number) => void;
  lookupCep: (cep: string) => void;
  lookupCnpj: (document: string) => void;
  showStatus: boolean;
};

function TenantFormDialog({
  title,
  description,
  open,
  onOpenChange,
  form,
  optionalModules,
  saving,
  submitLabel,
  onSubmit,
  updateForm,
  updateOwner,
  addOwner,
  removeOwner,
  lookupCep,
  lookupCnpj,
  showStatus,
}: TenantFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-2 pr-1">
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="radio"
                checked={form.personType === "pj"}
                onChange={() => updateForm("personType", "pj")}
              />
              Pessoa jurídica / CNPJ
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="radio"
                checked={form.personType === "pf"}
                onChange={() => updateForm("personType", "pf")}
              />
              Pessoa física / CPF
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`${title}-document`}>
                {form.personType === "pj" ? "CNPJ" : "CPF"}
              </Label>
              <Input
                id={`${title}-document`}
                value={form.document}
                inputMode="numeric"
                onChange={(event) => {
                  const document =
                    form.personType === "pj"
                      ? maskCnpj(event.target.value)
                      : maskCpf(event.target.value);
                  updateForm("document", document);
                  if (form.personType === "pj" && onlyDigits(document).length === 14)
                    lookupCnpj(document);
                }}
                placeholder={form.personType === "pj" ? "00.000.000/0000-00" : "000.000.000-00"}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${title}-name`}>
                {form.personType === "pj" ? "Nome fantasia" : "Nome completo"}
              </Label>
              <Input
                id={`${title}-name`}
                value={form.name}
                onChange={(event) => {
                  const name = event.target.value;
                  updateForm("name", name);
                  if (!form.slug) updateForm("slug", slugify(name));
                }}
                placeholder="Ex.: Cliente Engenharia LTDA"
              />
            </div>
            {form.personType === "pj" ? (
              <div className="grid gap-2">
                <Label htmlFor={`${title}-legal-name`}>Razão social</Label>
                <Input
                  id={`${title}-legal-name`}
                  value={form.legalName}
                  onChange={(event) => updateForm("legalName", event.target.value)}
                />
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor={`${title}-slug`}>Slug</Label>
              <Input
                id={`${title}-slug`}
                value={form.slug}
                onChange={(event) => updateForm("slug", slugify(event.target.value))}
                placeholder="cliente-engenharia"
              />
            </div>
            {showStatus ? (
              <div className="grid gap-2">
                <Label htmlFor={`${title}-status`}>Status da empresa</Label>
                <select
                  id={`${title}-status`}
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="ativo">Ativa</option>
                  <option value="bloqueado">Bloqueada</option>
                  <option value="inativo">Inativa</option>
                  <option value="pendente">Pendente</option>
                </select>
              </div>
            ) : null}
            <div className="grid gap-2 sm:col-span-2">
              <Label>Contato da empresa</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  placeholder="E-mail da empresa"
                  type="email"
                />
                <Input
                  value={form.phone}
                  onChange={(event) => updateForm("phone", maskPhone(event.target.value))}
                  placeholder="+55 (13) 99740-8515"
                  inputMode="tel"
                />
              </div>
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
                <Label htmlFor={`${title}-cep`}>CEP</Label>
                <Input
                  id={`${title}-cep`}
                  value={form.cep}
                  inputMode="numeric"
                  onChange={(event) => {
                    const cep = maskCep(event.target.value);
                    updateForm("cep", cep);
                    if (onlyDigits(cep).length === 8) lookupCep(cep);
                  }}
                  placeholder="00000-000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${title}-number`}>Número</Label>
                <Input
                  id={`${title}-number`}
                  value={form.number}
                  onChange={(event) => updateForm("number", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${title}-street`}>Rua / logradouro</Label>
                <Input id={`${title}-street`} value={form.street} readOnly className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${title}-neighborhood`}>Bairro</Label>
                <Input
                  id={`${title}-neighborhood`}
                  value={form.neighborhood}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${title}-city`}>Cidade</Label>
                <Input id={`${title}-city`} value={form.city} readOnly className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${title}-state`}>UF</Label>
                <Input id={`${title}-state`} value={form.state} readOnly className="bg-muted" />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor={`${title}-complement`}>Complemento</Label>
                <Input
                  id={`${title}-complement`}
                  value={form.complement}
                  onChange={(event) => updateForm("complement", event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Responsáveis / sócios</p>
                <p className="text-xs text-muted-foreground">
                  Responsável da empresa não precisa ser usuário autenticado. O +55 é aplicado
                  automaticamente ao telefone.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={addOwner}>
                Adicionar responsável
              </Button>
            </div>
            <div className="mt-3 space-y-3">
              {form.owners.map((owner, index) => (
                <div
                  key={`${owner.id ?? "owner"}-${index}`}
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
                    placeholder="Cargo/função"
                  />
                  <Input
                    value={owner.phone}
                    onChange={(event) => updateOwner(index, "phone", event.target.value)}
                    placeholder="+55 (13) 99740-8515"
                    inputMode="tel"
                  />
                  <Input
                    type="email"
                    value={owner.email}
                    onChange={(event) => updateOwner(index, "email", event.target.value)}
                    placeholder="E-mail"
                  />
                  {form.owners.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => removeOwner(index)}
                    >
                      Remover responsável
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Módulos contratados</Label>
            <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
              {optionalModules.map((mod) => (
                <label key={mod.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.modules.includes(mod.key)}
                    onChange={(event) =>
                      updateForm(
                        "modules",
                        event.target.checked
                          ? [...form.modules, mod.key]
                          : form.modules.filter((key) => key !== mod.key),
                      )
                    }
                  />
                  <span>{mod.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {money(mod.monthly_price)}/mês
                  </span>
                </label>
              ))}
            </div>
            {showStatus ? (
              <p className="text-xs text-muted-foreground">
                Alterações de módulos já contratados continuam sendo feitas na seção “Módulos
                contratados” do detalhe da empresa.
              </p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type TenantDetailProps = {
  tenant: AdminTenant;
  savingKey: string | null;
  onEdit: () => void;
  onArchive: () => void;
  onSetStatus: (status: string) => void;
  onSetModule: (mod: AdminModule, enabled: boolean) => void;
  onAddUser: () => void;
};

function TenantDetail({
  tenant,
  savingKey,
  onEdit,
  onArchive,
  onSetStatus,
  onSetModule,
  onAddUser,
}: TenantDetailProps) {
  const company = tenant.company_data ?? {};
  const nextStatus = tenant.status === "ativo" ? "bloqueado" : "ativo";
  const statusSaving = savingKey === `${tenant.id}:status`;
  const archiveSaving = savingKey === `${tenant.id}:archive`;

  return (
    <>
      <DialogHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <DialogTitle className="flex flex-wrap items-center gap-2 text-2xl">
              {tenant.name}
              <StatusBadge status={tenant.status} />
            </DialogTitle>
            <DialogDescription>
              Gestão detalhada da empresa/tenant. IDs e relacionamentos atuais são preservados.
            </DialogDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit3 className="mr-2 h-4 w-4" /> Editar
            </Button>
            <Button variant="outline" size="sm" onClick={onAddUser}>
              <UserPlus className="mr-2 h-4 w-4" /> Vincular usuário
            </Button>
            <Button
              variant={nextStatus === "ativo" ? "default" : "destructive"}
              size="sm"
              disabled={statusSaving}
              onClick={() => onSetStatus(nextStatus)}
            >
              {statusSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Power className="mr-2 h-4 w-4" />
              )}
              {nextStatus === "ativo" ? "Desbloquear" : "Bloquear"}
            </Button>
            <Button variant="destructive" size="sm" disabled={archiveSaving} onClick={onArchive}>
              {archiveSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir
            </Button>
          </div>
        </div>
      </DialogHeader>

      <div className="max-h-[72vh] space-y-5 overflow-y-auto pr-1">
        <Section title="Dados da empresa">
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Nome fantasia / empresa" value={tenant.name} />
            <Info label="Razão social" value={company.legalName} />
            <Info label="CPF/CNPJ" value={company.document} />
            <Info label="E-mail" value={company.email} />
            <Info label="Telefone" value={company.phone} />
            <Info label="Slug" value={tenant.slug} />
            <Info label="Endereço" value={compact([company.street, company.number], "—")} />
            <Info label="Complemento" value={company.complement} />
            <Info label="Bairro" value={company.neighborhood} />
            <Info label="Cidade/UF" value={compact([company.city, company.state])} />
            <Info label="CEP" value={company.cep} />
            <Info label="Cadastro" value={dateTime(tenant.created_at)} />
          </div>
        </Section>

        <Section title="Responsáveis / sócios">
          {tenant.owner_contacts?.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {tenant.owner_contacts.map((owner) => (
                <div
                  key={owner.id ?? `${owner.name}-${owner.email}`}
                  className="rounded-lg border bg-muted/30 p-3 text-sm"
                >
                  <p className="font-semibold">{owner.name}</p>
                  <p className="text-muted-foreground">
                    {owner.function || "Função não informada"}
                  </p>
                  <p>{owner.phone || "Telefone não informado"}</p>
                  <p>{owner.email || "E-mail não informado"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Sem responsáveis cadastrados.
            </p>
          )}
        </Section>

        <Section title="Usuários vinculados">
          <div className="space-y-2">
            {tenant.users.length ? (
              tenant.users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.email ?? user.user_id}</p>
                    <p className="text-xs text-muted-foreground">{user.user_id}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {user.is_owner && <Badge>Dono</Badge>}
                    <StatusBadge status={user.status} />
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Sem usuários vinculados.
              </p>
            )}
          </div>
        </Section>

        <Section title="Módulos contratados">
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
                        <Badge className="bg-success text-success-foreground">Ativo</Badge>
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
                      onCheckedChange={(checked) => onSetModule(mod, checked)}
                      aria-label={`${mod.enabled ? "Bloquear" : "Liberar"} módulo ${mod.name}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Status da empresa">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <Info label="Status atual" value={tenant.status} />
            <Info
              label="Módulos ativos"
              value={`${enabledModules(tenant)}/${tenant.modules.length}`}
            />
            <Info label="Valor mensal ativo" value={`${money(tenantMonthlyTotal(tenant))}/mês`} />
          </div>
          <Alert className="mt-3">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Exclusão protegida</AlertTitle>
            <AlertDescription>
              O botão Excluir inativa a empresa com auditoria. A exclusão física não é executada
              automaticamente porque o tenant possui vínculos com usuários, módulos, responsáveis e
              histórico.
            </AlertDescription>
          </Alert>
        </Section>

        <Section title="Auditoria recente">
          <div className="space-y-2">
            {tenant.audit_logs.length ? (
              tenant.audit_logs.map((log) => (
                <div key={log.id} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
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
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{value || "—"}</p>
    </div>
  );
}
