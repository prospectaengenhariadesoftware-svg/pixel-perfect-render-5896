import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Crown,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components/app/ui-kit";
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

type AdminTenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
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

function SuperAdminPage() {
  const { isPlatformAdmin, status } = useTenant();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("platform_admin_overview");
    if (rpcError) {
      setError(rpcError.message);
      setOverview(null);
    } else {
      setOverview(data as AdminOverview);
    }
    setLoading(false);
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
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Atualizar
          </Button>
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
              description="Crie o primeiro tenant pelo fluxo de onboarding antes de usar o painel."
            />
          ) : (
            <div className="space-y-5">
              {tenants.map((tenant) => {
                const enabledModules = tenant.modules.filter((m) => m.enabled).length;
                const owners = tenant.users.filter((u) => u.is_owner);
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
                      </div>
                      <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                        <p className="font-medium">Dono(s)</p>
                        <p className="text-muted-foreground">
                          {owners.map((u) => u.email ?? u.user_id).join(", ") || "Sem dono ativo"}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
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
    </div>
  );
}
