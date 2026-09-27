import { createFileRoute } from "@tanstack/react-router";
import { ModuleHome } from "@/components/app/ModuleHome";

export const Route = createFileRoute("/app/obras")({
  head: () => ({
    meta: [
      { title: "Obras | Engenharia SaaS Modular" },
      { name: "description", content: "Contratos, medições, diários de obra e cronogramas." },
      { property: "og:title", content: "Obras | Engenharia SaaS Modular" },
      {
        property: "og:description",
        content: "Contratos, medições, diários de obra e cronogramas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ModuleHome module="obras" />,
});
