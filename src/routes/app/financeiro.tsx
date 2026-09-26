import { createFileRoute } from "@tanstack/react-router";
import { ModuleHome } from "@/components/app/ModuleHome";

export const Route = createFileRoute("/app/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro | Engenharia SaaS Modular" },
      { name: "description", content: "Contas a pagar e receber, fluxo de caixa e centros de custo." },
      { property: "og:title", content: "Financeiro | Engenharia SaaS Modular" },
      { property: "og:description", content: "Contas a pagar e receber, fluxo de caixa e centros de custo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ModuleHome module="financeiro" />,
});
