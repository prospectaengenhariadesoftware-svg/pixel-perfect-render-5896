import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/ui-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSupabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant-context";

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

type OwnerContactRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  function_title: string | null;
};

type OwnerContact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  function: string | null;
};

type TenantUserRow = {
  id: string;
  user_id: string;
  is_owner: boolean;
  status: string;
  created_at: string;
  tenant_roles: { name: string | null } | null;
};

type TenantUser = {
  id: string;
  role: string | null;
  is_owner: boolean;
  status: string;
  created_at: string;
};

const empty = "—";

function dateShort(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : empty;
}

function addressFromCompany(company: CompanyData | null) {
  if (!company) return empty;
  const firstLine = [company.street, company.number, company.complement].filter(Boolean).join(", ");
  const secondLine = [company.neighborhood, company.city, company.state]
    .filter(Boolean)
    .join(" / ");
  return [firstLine, secondLine, company.cep].filter(Boolean).join(" · ") || empty;
}

export function EmpresaModule() {
  const supabase = getSupabase();
  const { tenant, status: tenantStatus } = useTenant();
  const tenantId = tenant?.id ?? null;
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [owners, setOwners] = useState<OwnerContact[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantStatus === "loading") return;

    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setLoading(false);
      return;
    }

    if (!tenantId) {
      setError("Nenhum tenant ativo foi identificado para este usuário.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCompanyArea() {
      setLoading(true);
      setError(null);

      try {
        const { data: settings, error: settingsError } = await supabase
          .from("tenant_settings")
          .select("settings")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (settingsError) throw settingsError;

        const companySettings =
          settings?.settings && typeof settings.settings === "object"
            ? (settings.settings as CompanyData)
            : {};

        const { data: ownerRows, error: ownersError } = await supabase
          .from("tenant_owner_contacts")
          .select("id, name, phone, email, function_title")
          .eq("tenant_id", tenantId)
          .order("name", { ascending: true });

        if (ownersError) throw ownersError;

        const { data: userRows, error: usersError } = await supabase
          .from("tenant_users")
          .select("id, user_id, is_owner, status, created_at, tenant_roles(name)")
          .eq("tenant_id", tenantId)
          .order("is_owner", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(500);

        if (usersError) throw usersError;

        if (!cancelled) {
          setCompany(companySettings);
          setOwners(
            ((ownerRows ?? []) as OwnerContactRow[]).map((owner) => ({
              id: owner.id,
              name: owner.name,
              phone: owner.phone,
              email: owner.email,
              function: owner.function_title,
            })),
          );
          setUsers(
            ((userRows ?? []) as TenantUserRow[]).map((user) => ({
              id: user.id,
              role: user.tenant_roles?.name ?? null,
              is_owner: user.is_owner,
              status: user.status,
              created_at: user.created_at,
            })),
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Falha inesperada ao carregar dados da empresa.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCompanyArea();

    return () => {
      cancelled = true;
    };
  }, [supabase, tenantId, tenantStatus]);

  const companyFields = useMemo(
    () => [
      { label: "CNPJ / CPF", value: company?.document },
      { label: "Razão Social", value: company?.legalName },
      { label: "Nome Fantasia", value: tenant?.name },
      { label: "E-mail", value: company?.email },
      { label: "Telefone", value: company?.phone },
      { label: "Endereço", value: addressFromCompany(company) },
    ],
    [company, tenant?.name],
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Empresa"
        title={tenant?.name ?? "Empresa"}
        description="Dados cadastrais, responsáveis e usuários vinculados ao tenant atual."
      />

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="dados">Dados da Empresa</TabsTrigger>
          <TabsTrigger value="donos">Donos / Responsáveis</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">
                  Carregando dados reais do tenant...
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {companyFields.map((field) => (
                    <div key={field.label} className="rounded-lg border bg-card p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {field.label}
                      </div>
                      <div className="mt-1 text-sm font-medium text-foreground">
                        {field.value || empty}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donos">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Donos / Responsáveis</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Carregando responsáveis...</div>
              ) : owners.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Não há responsáveis cadastrados para este tenant.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {owners.map((owner) => (
                    <div key={owner.id} className="rounded-lg border bg-card p-4">
                      <div className="text-base font-semibold">{owner.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {owner.function || "Responsável"}
                      </div>
                      <div className="mt-3 space-y-1 text-sm">
                        <div>{owner.phone || empty}</div>
                        <div>{owner.email || empty}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Usuários vinculados</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Carregando vínculos...</div>
              ) : users.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Não há usuários vinculados a este tenant.
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-col gap-2 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="font-medium">
                          {user.is_owner ? "Administrador / proprietário" : user.role || "Usuário"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Identificação nominal será carregada pela camada segura do banco.
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.status} · vínculo em {dateShort(user.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
