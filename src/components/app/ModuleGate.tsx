import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { getModule, type ModuleKey } from "@/lib/modules";
import { useTenant } from "@/lib/tenant-context";
import { EmptyState, LoadingState } from "./ui-kit";

/**
 * Bloqueio de UI para módulos não contratados.
 * Importante: isto é só a camada visual. A proteção real deve ocorrer
 * no servidor (checagem em tenant_modules) e no banco (RLS).
 */
export function ModuleGate({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const { isActive, status } = useTenant();
  if (status === "loading") return <LoadingState label="Verificando acesso ao módulo..." />;
  if (isActive(module)) return <>{children}</>;
  const mod = getModule(module);
  return (
    <div className="mx-auto max-w-3xl py-10">
      <EmptyState
        icon={Lock}
        title={`Módulo ${mod.name} não contratado`}
        description={`Este módulo não está ativo para a sua empresa. Valor: R$ ${mod.monthlyPrice}/mês por empresa.`}
        action={
          <Button asChild>
            <Link to="/app/modulos">Ver módulos e contratação</Link>
          </Button>
        }
      />
    </div>
  );
}
