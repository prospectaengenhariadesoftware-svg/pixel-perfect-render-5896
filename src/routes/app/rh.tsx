import { createFileRoute } from "@tanstack/react-router";
import { ModuleWorkspace, type EntityConfig } from "@/components/app/ModuleWorkspace";

const entities: EntityConfig[] = [
  {
    "table": "rh_employees",
    "label": "Colaboradores",
    "singular": "Colaborador",
    "fields": [
      {
        "name": "nome",
        "label": "Nome",
        "required": true
      },
      {
        "name": "cargo",
        "label": "Cargo"
      },
      {
        "name": "departamento",
        "label": "Departamento"
      }
    ]
  },
  {
    "table": "rh_roles",
    "label": "Cargos",
    "singular": "Cargo",
    "fields": [
      {
        "name": "nome",
        "label": "Nome do cargo",
        "required": true
      }
    ]
  },
  {
    "table": "rh_departments",
    "label": "Departamentos",
    "singular": "Departamento",
    "fields": [
      {
        "name": "nome",
        "label": "Nome",
        "required": true
      }
    ]
  }
];

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
  component: () => <ModuleWorkspace module="rh" entities={entities} />,
});
