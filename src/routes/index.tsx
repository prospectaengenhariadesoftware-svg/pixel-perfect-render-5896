import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Database, Layers, Lock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MODULES } from "@/lib/modules";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Engenharia SaaS Modular | Gestão para empresas de engenharia" },
      {
        name: "description",
        content:
          "Plataforma multi-tenant e modular para empresas de engenharia: obras, suprimentos, RH, empresa e financeiro em um só lugar.",
      },
      {
        property: "og:title",
        content: "Engenharia SaaS Modular | Gestão para empresas de engenharia",
      },
      {
        property: "og:description",
        content:
          "Contrate apenas os módulos que sua construtora precisa. Multi-tenant, seguro e escalável.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const pilares = [
  {
    icon: Layers,
    titulo: "Arquitetura modular",
    texto: "Cada módulo tem rotas, permissões e preço próprios — ative apenas o que faz sentido.",
  },
  {
    icon: Lock,
    titulo: "Isolamento por empresa",
    texto: "Multi-tenant com Row Level Security: os dados de cada cliente nunca se cruzam.",
  },
  {
    icon: Database,
    titulo: "Infraestrutura própria",
    texto: "Banco, autenticação e arquivos em servidor dedicado, sob seu controle.",
  },
  {
    icon: ShieldCheck,
    titulo: "Pronto para vender",
    texto: "Planos, assinaturas e painel de administração da plataforma desde o início.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <span className="flex items-center gap-3">
            <span className="bg-gradient-brand flex h-9 w-9 items-center justify-center rounded-md font-display text-sm font-bold text-primary-foreground">
              ES
            </span>
            <span className="font-display text-sm font-semibold">Engenharia SaaS Modular</span>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/app/dashboard">Ver demonstração</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="bg-gradient-ink relative overflow-hidden">
        <div className="grid-blueprint pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 py-24 lg:py-32">
          <Badge
            variant="outline"
            className="border-white/20 bg-white/5 text-xs text-sidebar-foreground"
          >
            Plataforma B2B multi-tenant
          </Badge>
          <h1 className="mt-6 max-w-3xl font-display text-4xl leading-[1.08] font-semibold text-white sm:text-5xl lg:text-6xl">
            O sistema de gestão que a sua engenharia contrata por módulo.
          </h1>
          <p className="mt-6 max-w-xl text-base text-sidebar-foreground/70">
            Obras, suprimentos, recursos humanos, empresa e financeiro em uma plataforma única,
            desenhada para construtoras e escritórios de engenharia que precisam de controle real.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/app/dashboard">
                Acessar demonstração <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link to="/login">Já sou cliente</Link>
            </Button>
          </div>
          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-xs text-sidebar-foreground/60">
            {["Dados isolados por empresa", "Permissões por módulo", "Responsivo e rápido"].map(
              (item) => (
                <span key={item} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-primary" /> {item}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="max-w-2xl text-3xl font-semibold">
          Construído como produto comercial, não como sistema interno.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pilares.map((p) => {
            const Icon = p.icon;
            return (
              <Card key={p.titulo} className="bg-gradient-surface shadow-card border-border/70">
                <CardContent className="p-6">
                  <span className="bg-gradient-brand flex h-10 w-10 items-center justify-center rounded-md text-primary-foreground">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <p className="mt-4 font-display text-base font-semibold">{p.titulo}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{p.texto}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-y border-border bg-secondary/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold">Módulos disponíveis</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Comece pelo essencial e adicione módulos conforme a operação cresce.
              </p>
            </div>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Card key={mod.key} className="shadow-card border-border/70">
                  <CardContent className="flex h-full flex-col p-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/60 text-accent-foreground">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <p className="mt-4 font-display text-base font-semibold">{mod.name}</p>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">{mod.description}</p>
                    <p className="mt-5 text-sm font-semibold">
                      {mod.core ? (
                        <span className="text-muted-foreground">Incluso em todos os planos</span>
                      ) : (
                        <>
                          R$ {mod.monthlyPrice.toLocaleString("pt-BR")}
                          <span className="text-muted-foreground"> /mês por empresa</span>
                        </>
                      )}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="bg-gradient-brand shadow-brand flex flex-wrap items-center justify-between gap-6 rounded-xl p-10">
          <div className="max-w-lg">
            <h2 className="font-display text-2xl font-semibold text-primary-foreground">
              Quer ver a plataforma funcionando na sua operação?
            </h2>
            <p className="mt-2 text-sm text-primary-foreground/80">
              Explore a demonstração ou entre em contato para configurar o ambiente da sua empresa.
            </p>
          </div>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/app/dashboard">
              Abrir demonstração <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Engenharia SaaS Modular</span>
          <span>Multi-tenant · PostgreSQL · Row Level Security</span>
        </div>
      </footer>
    </div>
  );
}
