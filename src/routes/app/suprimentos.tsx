import { createFileRoute } from "@tanstack/react-router";
import { ModuleWorkspace, type EntityConfig } from "@/components/app/ModuleWorkspace";

const entities: EntityConfig[] = [
  {
    "table": "suppliers",
    "label": "Fornecedores",
    "singular": "Fornecedor",
    "fields": [
      {
        "name": "nome",
        "label": "Razão social",
        "required": true
      },
      {
        "name": "cnpj",
        "label": "CNPJ"
      }
    ]
  },
  {
    "table": "materials",
    "label": "Materiais",
    "singular": "Material",
    "fields": [
      {
        "name": "nome",
        "label": "Descrição",
        "required": true
      },
      {
        "name": "unidade",
        "label": "Unidade"
      }
    ]
  },
  {
    "table": "purchase_requests",
    "label": "Requisições",
    "singular": "Requisição",
    "fields": [
      {
        "name": "titulo",
        "label": "Título",
        "required": true
      },
      {
        "name": "obra",
        "label": "Obra"
      }
    ]
  }
];

export const Route = createFileRoute("/app/suprimentos")({
  head: () => ({
    meta: [
      { title: "Suprimentos | Engenharia SaaS Modular" },
      { name: "description", content: "Fornecedores, materiais, requisições e pedidos de compra." },
      { property: "og:title", content: "Suprimentos | Engenharia SaaS Modular" },
      { property: "og:description", content: "Fornecedores, materiais, requisições e pedidos de compra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ModuleWorkspace module="suprimentos" entities={entities} />,
});
