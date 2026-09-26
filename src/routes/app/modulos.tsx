import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AuditTimeline, DemoBadge, PageHeader, StatusBadge } from "@/components/app/ui-kit";
import { MODULES } from "@/lib/modules";
import { useTenant } from "@/lib/tenant-context";

export const Route = createFileRoute("/app/modulos")({
  head: () => ({
    meta: [
      { title: "Módulos contratados | Engenharia SaaS Modular" },
      { name: "description", content: "Ative ou desative os módulos contratados pela sua empresa." },
      { property: "og:title", content: "Módulos contratados | Engenharia SaaS Modular" },
      { property: "og:description", content: "Gestão de módulos e assinatura por empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModulosPage,
});

function ModulosPage() {
  const { isActive, toggleModule, activeModules, audit } = useTenant();
  const total = MODULES.filter((m) => isActive(m.key)).reduce((s, m) => s + m.monthlyPrice, 0);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Assinatura"
        title="Módulos contratados"
        description="Cada módulo é contratado separadamente por empresa. Aqui a ativação é uma simulação local — a cobrança real será ligada depois."
        actions={<DemoBadge />}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const on = isActive(m.key);
            return (
              <Card key={m.key} className="shadow-card">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/60 text-accent-foreground">
                      <Icon className="h-5 w-5" />
                    </span>
                    {m.core ? (
                      <StatusBadge status="incluso" />
                    ) : (
                      <Switch checked={on} onCheckedChange={() => toggleModule(m.key)} aria-label={`Ativar ${m.name}`} />
                    )}
                  </div>
                  <div>
                    <p className="font-display font-semibold">{m.name}</p>
                    <p className="text-sm text-muted-foreground">{m.description}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{m.core ? "Incluso" : `R$ ${m.monthlyPrice}/mês`}</span>
                    {on && (
                      <Button asChild variant="link" size="sm" className="h-auto p-0">
                        <Link to={m.path}>Abrir</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{activeModules.length} de {MODULES.length} módulos ativos</p>
              <p className="font-display text-2xl font-semibold">R$ {total}/mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
            <CardContent><AuditTimeline entries={audit.filter((a) => a.module === "plataforma")} /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
