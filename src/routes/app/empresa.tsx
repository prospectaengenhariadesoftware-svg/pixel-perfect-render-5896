import { createFileRoute } from "@tanstack/react-router";
import { ModuleHome } from "@/components/app/ModuleHome";

export const Route = createFileRoute("/app/empresa")({
  head: () => ({
    meta: [
      { title: "Empresa | Engenharia SaaS Modular" },
      { name: "description", content: "Dados cadastrais, filiais, documentos e certidões da empresa." },
      { property: "og:title", content: "Empresa | Engenharia SaaS Modular" },
      { property: "og:description", content: "Dados cadastrais, filiais, documentos e certidões da empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ModuleHome module="empresa" />,
});
