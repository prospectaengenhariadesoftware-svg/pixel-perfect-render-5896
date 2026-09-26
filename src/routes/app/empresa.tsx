import { createFileRoute } from "@tanstack/react-router";
import { ModuleWorkspace, type EntityConfig } from "@/components/app/ModuleWorkspace";

const entities: EntityConfig[] = [
  {
    "table": "company_units",
    "label": "Unidades",
    "singular": "Unidade",
    "fields": [
      {
        "name": "nome",
        "label": "Nome da unidade",
        "required": true
      },
      {
        "name": "cidade",
        "label": "Cidade"
      }
    ]
  },
  {
    "table": "company_documents",
    "label": "Documentos",
    "singular": "Documento",
    "fields": [
      {
        "name": "titulo",
        "label": "Título",
        "required": true
      },
      {
        "name": "validade",
        "label": "Validade"
      }
    ]
  }
];

export const Route = createFileRoute("/app/empresa")({
  head: () => ({
    meta: [
      { title: "Empresa | Engenharia SaaS Modular" },
      { name: "description", content: "Dados cadastrais, unidades e documentos da empresa." },
      { property: "og:title", content: "Empresa | Engenharia SaaS Modular" },
      { property: "og:description", content: "Dados cadastrais, unidades e documentos da empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ModuleWorkspace module="empresa" entities={entities} />,
});
