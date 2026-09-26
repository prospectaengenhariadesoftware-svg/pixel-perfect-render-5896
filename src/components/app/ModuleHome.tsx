import { CheckCircle2, Construction } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/app/ui-kit";
import { ModuleGate } from "@/components/app/ModuleGate";
import { getModule, MODULE_ROADMAP, type ModuleKey } from "@/lib/modules";

/** Página inicial de um módulo: escopo planejado, sem dados inventados. */
export function ModuleHome({ module }: { module: Exclude<ModuleKey, "dashboard"> }) {
  const mod = getModule(module);
  return (
    <ModuleGate module={module}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader eyebrow="Módulo" title={mod.name} description={mod.description} />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <EmptyState
            icon={Construction}
            title="Módulo em construção"
            description="Os cadastros deste módulo serão liberados nas próximas entregas, já gravando no banco com isolamento por empresa."
          />
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Escopo planejado</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {MODULE_ROADMAP[module].map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModuleGate>
  );
}
