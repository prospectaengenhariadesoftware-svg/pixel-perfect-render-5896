import { createFileRoute } from "@tanstack/react-router";
import { ModuleHome } from "@/components/app/ModuleHome";

export const Route = createFileRoute("/app/rh")({
  head: () => ({
    meta: [
      { title: "Recursos Humanos | Engenharia SaaS Modular" },
      { name: "description", content: "Colaboradores, cargos, departamentos e documentos." },
      { property: "og:title", content: "Recursos Humanos | Engenharia SaaS Modular" },
      { property: "og:description", content: "Colaboradores, cargos, departamentos e documentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ModuleHome module="rh" />,
});
