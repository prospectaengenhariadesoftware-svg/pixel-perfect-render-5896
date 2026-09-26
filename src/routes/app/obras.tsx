import { createFileRoute } from "@tanstack/react-router";
import { ModuleWorkspace, type EntityConfig } from "@/components/app/ModuleWorkspace";

const entities: EntityConfig[] = [
  {
    "table": "works",
    "label": "Obras",
    "singular": "Obra",
    "fields": [
      {
        "name": "nome",
        "label": "Nome da obra",
        "required": true
      },
      {
        "name": "cliente",
        "label": "Cliente"
      }
    ]
  },
  {
    "table": "work_tasks",
    "label": "Tarefas",
    "singular": "Tarefa",
    "fields": [
      {
        "name": "titulo",
        "label": "Título",
        "required": true
      },
      {
        "name": "responsavel",
        "label": "Responsável"
      }
    ]
  }
];

export const Route = createFileRoute("/app/obras")({
  head: () => ({
    meta: [
      { title: "Obras | Engenharia SaaS Modular" },
      { name: "description", content: "Obras, tarefas, avanço físico e centros de custo." },
      { property: "og:title", content: "Obras | Engenharia SaaS Modular" },
      { property: "og:description", content: "Obras, tarefas, avanço físico e centros de custo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ModuleWorkspace module="obras" entities={entities} />,
});
