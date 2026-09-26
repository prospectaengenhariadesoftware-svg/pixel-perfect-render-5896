import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingState, PageHeader } from "@/components/app/ui-kit";
import { MODULES } from "@/lib/modules";
import { useTenant } from "@/lib/tenant-context";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Engenharia SaaS Modular" },
      { name: "description", content: "Visão geral da empresa e dos módulos contratados." },
      { property: "og:title", content: "Dashboard | Engenharia SaaS Modular" },
      { property: "og:description", content: "Painel da empresa e módulos contratados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { status, tenant, isActive } = useTenant();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Visão geral"
        title={tenant ? tenant.name : "Dashboard"}
        description="Os indicadores aparecem aqui conforme cada módulo começar a registrar dados reais."
      />

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Indicadores</CardTitle>
          <CardDescription>Obras, equipe, suprimentos e financeiro consolidados.</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" ? (
            <LoadingState />
          ) : (
            <EmptyState
              title="Sem dados ainda"
              description="Nenhum registro foi criado nos módulos. Os indicadores serão calculados a partir dos cadastros reais."
            />
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Módulos</CardTitle>
            <CardDescription>Cada módulo é contratado e liberado por empresa.</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/modulos">
              Ver plano <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {MODULES.map((mod) => {
              const active = isActive(mod.key);
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.key}
                  to={mod.path}
                  className="flex gap-3 rounded-lg border border-border/70 bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/60 text-accent-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{mod.name}</p>
                      {mod.core ? (
                        <Badge variant="secondary" className="text-[10px]">Base</Badge>
                      ) : active ? (
                        <Badge className="bg-success text-[10px] text-success-foreground">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <Lock className="h-2.5 w-2.5" /> Não contratado
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{mod.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
