import { createFileRoute } from "@tanstack/react-router";
import { ModuleHome } from "@/components/app/ModuleHome";

export const Route = createFileRoute("/app/suprimentos")({
  head: () => ({
    meta: [
      { title: "Suprimentos | Engenharia SaaS Modular" },
      { name: "description", content: "Requisições, cotações, pedidos e almoxarifado." },
      { property: "og:title", content: "Suprimentos | Engenharia SaaS Modular" },
      { property: "og:description", content: "Requisições, cotações, pedidos e almoxarifado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ModuleHome module="suprimentos" />,
});
