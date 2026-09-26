import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  HardHat,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { DEMO_TENANT, MODULES } from "@/lib/modules";
import { useTenant } from "@/lib/tenant-context";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Engenharia SaaS Modular" },
      {
        name: "description",
        content:
          "Visão geral da operação: obras em andamento, equipe, suprimentos e módulos contratados.",
      },
      { property: "og:title", content: "Dashboard | Engenharia SaaS Modular" },
      {
        property: "og:description",
        content: "Painel consolidado de obras, equipe, suprimentos e financeiro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const kpis = [
  { label: "Obras em andamento", value: "12", delta: "+2 no mês", icon: HardHat },
  { label: "Colaboradores ativos", value: "348", delta: "+14 no mês", icon: Users },
  { label: "Medições a faturar", value: "R$ 2,4 mi", delta: "+8,2%", icon: CircleDollarSign },
  { label: "Margem média", value: "18,6%", delta: "+1,4 p.p.", icon: TrendingUp },
];

const obras = [
  { nome: "Viaduto Leste — Lote 3", cliente: "DER-SP", avanco: 72, prazo: "Nov/2026" },
  { nome: "Galpão Industrial Cotia", cliente: "Grupo Andrade", avanco: 45, prazo: "Fev/2027" },
  { nome: "ETE Municipal Sorocaba", cliente: "Prefeitura", avanco: 88, prazo: "Out/2026" },
  { nome: "Retrofit Sede Corporativa", cliente: "Vetor Holding", avanco: 23, prazo: "Mai/2027" },
];

const pendencias = [
  { titulo: "7 ASOs vencendo em 15 dias", modulo: "Recursos Humanos", tom: "warning" as const },
  { titulo: "3 cotações aguardando aprovação", modulo: "Suprimentos", tom: "default" as const },
  { titulo: "Medição 09 sem diário anexado", modulo: "Obras", tom: "destructive" as const },
  { titulo: "2 certidões da empresa a renovar", modulo: "Empresa", tom: "warning" as const },
];

function Dashboard() {
  const { activeModules: ACTIVE_MODULES } = useTenant();
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Bem-vinda, {DEMO_TENANT.userName}</p>
          <h1 className="mt-1 text-3xl font-semibold">Visão geral</h1>
        </div>
        <Badge variant="outline" className="gap-1.5 border-accent bg-accent/40 text-accent-foreground">
          <CalendarClock className="h-3.5 w-3.5" /> Demonstração visual
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="bg-gradient-surface shadow-card border-border/70">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/60 text-accent-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 font-display text-3xl font-semibold tracking-tight">
                  {kpi.value}
                </p>
                <p className="mt-1 text-xs font-medium text-success">{kpi.delta}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Obras em execução</CardTitle>
            <CardDescription>Avanço físico consolidado por contrato.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {obras.map((obra) => (
              <div key={obra.nome}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{obra.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {obra.cliente} · entrega {obra.prazo}
                    </p>
                  </div>
                  <span className="font-display text-sm font-semibold">{obra.avanco}%</span>
                </div>
                <Progress value={obra.avanco} className="mt-2 h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Pendências</CardTitle>
            <CardDescription>Itens que exigem ação da equipe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendencias.map((p) => (
              <div key={p.titulo} className="rounded-md border border-border/70 bg-secondary/40 p-3">
                <p className="text-sm font-medium">{p.titulo}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.modulo}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Módulos contratados</CardTitle>
            <CardDescription>
              Cada módulo é contratado e liberado por tenant, com permissões próprias.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/dashboard">
              Gerenciar plano <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Separator className="mb-5" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {MODULES.map((mod) => {
              const active = ACTIVE_MODULES.includes(mod.key);
              const Icon = mod.icon;
              return (
                <div
                  key={mod.key}
                  className="flex gap-3 rounded-lg border border-border/70 bg-card p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/60 text-accent-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{mod.name}</p>
                      {mod.core ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Base
                        </Badge>
                      ) : active ? (
                        <Badge className="bg-success text-[10px] text-success-foreground">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Não contratado
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{mod.description}</p>
                    {!mod.core && (
                      <p className="mt-2 text-xs font-medium">
                        R$ {mod.monthlyPrice.toLocaleString("pt-BR")}
                        <span className="text-muted-foreground"> /mês</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
