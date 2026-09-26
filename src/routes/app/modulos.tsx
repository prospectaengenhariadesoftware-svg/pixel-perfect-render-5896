import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatusBadge } from "@/components/app/ui-kit";
import { MODULES } from "@/lib/modules";
import { useTenant } from "@/lib/tenant-context";

export const Route = createFileRoute("/app/modulos")({
  head: () => ({
    meta: [
      { title: "Módulos contratados | Engenharia SaaS Modular" },
      { name: "description", content: "Módulos contratados pela sua empresa e valores mensais." },
      { property: "og:title", content: "Módulos contratados | Engenharia SaaS Modular" },
      { property: "og:description", content: "Módulos contratados e assinatura por empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModulosPage,
});

function ModulosPage() {
  const { isActive, status } = useTenant();
  const ready = status === "ready";
  const total = MODULES.filter((m) => isActive(m.key)).reduce((s, m) => s + m.monthlyPrice, 0);
  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Assinatura"
        title="Módulos contratados"
        description="A liberação de módulos é feita pela administração da plataforma e gravada no banco da sua empresa."
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
                    {ready && <StatusBadge status={m.core ? "incluso" : on ? "ativo" : "inativo"} />}
                  </div>
                  <div>
                    <p className="font-display font-semibold">{m.name}</p>
                    <p className="text-sm text-muted-foreground">{m.description}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{m.core ? "Incluso" : `${brl(m.monthlyPrice)}/mês`}</span>
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
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {ready ? (
              <p className="font-display text-2xl font-semibold">{brl(total)}/mês</p>
            ) : (
              <p className="text-muted-foreground">Disponível após conectar a empresa.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
