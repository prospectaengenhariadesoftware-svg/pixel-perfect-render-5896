import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getModule, type ModuleKey } from "@/lib/modules";
import { useTenant } from "@/lib/tenant-context";
import { ModuleGate } from "./ModuleGate";
import {
  AuditTimeline,
  ConfirmDialog,
  DataTable,
  DemoBadge,
  EmptyState,
  FilterBar,
  FormModal,
  PageHeader,
  StatusBadge,
  type FormField,
} from "./ui-kit";

export interface EntityConfig {
  /** Nome da tabela prevista no banco (ex.: rh_employees). */
  table: string;
  label: string;
  singular: string;
  fields: FormField[];
}

interface Row {
  id: string;
  status: string;
  created_at: string;
  [k: string]: string;
}

function useLocalRows(key: string) {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setRows(JSON.parse(raw));
    } catch {
      /* ignora */
    }
  }, [key]);
  const save = (next: Row[]) => {
    setRows(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  return [rows, save] as const;
}

function EntityPanel({ module, entity }: { module: ModuleKey; entity: EntityConfig }) {
  const { logAudit } = useTenant();
  const [rows, setRows] = useLocalRows(`es-demo-${entity.table}`);
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Row | null>(null);
  const primary = entity.fields[0]?.name ?? "id";

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return q ? rows.filter((r) => entity.fields.some((f) => r[f.name]?.toLowerCase().includes(q))) : rows;
  }, [rows, filter, entity.fields]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar value={filter} onChange={setFilter} placeholder={`Filtrar ${entity.label.toLowerCase()}...`} />
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Novo {entity.singular.toLowerCase()}
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={`Nenhum ${entity.singular.toLowerCase()} cadastrado`}
          description={`Registros ficam salvos apenas neste navegador até o banco ser conectado (tabela prevista: ${entity.table}).`}
          action={<Button variant="outline" onClick={() => setCreating(true)}>Cadastrar o primeiro</Button>}
        />
      ) : (
        <DataTable
          rows={filtered}
          columns={[
            ...entity.fields.map((f) => ({ key: f.name, header: f.label, render: (r: Row) => r[f.name] || "—" })),
            { key: "status", header: "Status", render: (r: Row) => <StatusBadge status={r.status} /> },
            {
              key: "acoes",
              header: "",
              className: "w-12 text-right",
              render: (r: Row) => (
                <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => setRemoving(r)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              ),
            },
          ]}
        />
      )}

      <FormModal
        open={creating}
        onOpenChange={setCreating}
        title={`Novo ${entity.singular.toLowerCase()}`}
        description="Demonstração visual — salvo apenas neste navegador."
        fields={entity.fields}
        onSubmit={(values) => {
          const row: Row = { ...values, id: crypto.randomUUID(), status: "ativo", created_at: new Date().toISOString() };
          setRows([row, ...rows]);
          logAudit({ action: `${entity.singular} criado`, module, detail: values[primary] ?? "" });
        }}
      />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Excluir ${entity.singular.toLowerCase()}?`}
        description={removing ? `"${removing[primary]}" será removido.` : ""}
        confirmLabel="Excluir"
        onConfirm={() => {
          if (!removing) return;
          setRows(rows.filter((r) => r.id !== removing.id));
          logAudit({ action: `${entity.singular} excluído`, module, detail: removing[primary] ?? "" });
          setRemoving(null);
        }}
      />
    </div>
  );
}

export function ModuleWorkspace({ module, entities }: { module: ModuleKey; entities: EntityConfig[] }) {
  const mod = getModule(module);
  const { audit } = useTenant();
  return (
    <ModuleGate module={module}>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <PageHeader eyebrow="Módulo" title={mod.name} description={mod.description} actions={<DemoBadge />} />
        <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
          <Tabs defaultValue={entities[0]?.table ?? ""}>
            <TabsList className="flex-wrap">
              {entities.map((e) => (
                <TabsTrigger key={e.table} value={e.table}>{e.label}</TabsTrigger>
              ))}
            </TabsList>
            {entities.map((e) => (
              <TabsContent key={e.table} value={e.table} className="mt-4">
                <EntityPanel module={module} entity={e} />
              </TabsContent>
            ))}
          </Tabs>
          <Card className="h-fit">
            <CardHeader><CardTitle className="text-base">Auditoria do módulo</CardTitle></CardHeader>
            <CardContent><AuditTimeline entries={audit.filter((a) => a.module === module)} /></CardContent>
          </Card>
        </div>
      </div>
    </ModuleGate>
  );
}
