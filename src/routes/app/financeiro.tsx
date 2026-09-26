import { createFileRoute } from "@tanstack/react-router";
import { ModuleWorkspace, type EntityConfig } from "@/components/app/ModuleWorkspace";

const entities: EntityConfig[] = [
  {
    "table": "financial_accounts_payable",
    "label": "Contas a pagar",
    "singular": "Conta a pagar",
    "fields": [
      {
        "name": "descricao",
        "label": "Descrição",
        "required": true
      },
      {
        "name": "valor",
        "label": "Valor (R$)"
      },
      {
        "name": "vencimento",
        "label": "Vencimento"
      }
    ]
  },
  {
    "table": "financial_accounts_receivable",
    "label": "Contas a receber",
    "singular": "Conta a receber",
    "fields": [
      {
        "name": "descricao",
        "label": "Descrição",
        "required": true
      },
      {
        "name": "valor",
        "label": "Valor (R$)"
      }
    ]
  },
  {
    "table": "financial_categories",
    "label": "Categorias",
    "singular": "Categoria",
    "fields": [
      {
        "name": "nome",
        "label": "Nome",
        "required": true
      }
    ]
  }
];

export const Route = createFileRoute("/app/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro | Engenharia SaaS Modular" },
      { name: "description", content: "Contas a pagar e receber, categorias e lançamentos." },
      { property: "og:title", content: "Financeiro | Engenharia SaaS Modular" },
      { property: "og:description", content: "Contas a pagar e receber, categorias e lançamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ModuleWorkspace module="financeiro" entities={entities} />,
});
