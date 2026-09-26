import { Link } from "@tanstack/react-router";
import { Lock, Settings, Sparkles } from "lucide-react";
import { DEMO_TENANT, MODULES } from "@/lib/modules";
import { useTenant } from "@/lib/tenant-context";
import { cn } from "@/lib/utils";

function BrandMark() {
  return (
    <Link to="/app/dashboard" className="flex items-center gap-3 px-2 py-1">
      <span className="bg-gradient-brand flex h-9 w-9 items-center justify-center rounded-md font-display text-sm font-bold text-primary-foreground">
        ES
      </span>
      <span className="leading-tight">
        <span className="block font-display text-sm font-semibold text-sidebar-accent-foreground">
          Engenharia SaaS
        </span>
        <span className="block text-[11px] tracking-wide text-sidebar-foreground/60 uppercase">
          Modular
        </span>
      </span>
    </Link>
  );
}

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { activeModules: ACTIVE_MODULES } = useTenant();
  return (
    <div className="bg-gradient-ink flex h-full w-full flex-col border-r border-sidebar-border text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-4 py-5">
        <BrandMark />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[11px] font-semibold tracking-widest text-sidebar-foreground/45 uppercase">
          Módulos
        </p>
        <ul className="space-y-1">
          {MODULES.map((mod) => {
            const active = ACTIVE_MODULES.includes(mod.key);
            const Icon = mod.icon;

            if (!active) {
              return (
                <li key={mod.key}>
                  <Link
                    to={mod.path}
                    onClick={onNavigate}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/40 transition-colors hover:text-sidebar-foreground/70"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{mod.name}</span>
                    <Lock className="h-3.5 w-3.5" />
                  </Link>
                </li>
              );
            }

            return (
              <li key={mod.key}>
                <Link
                  to={mod.path}
                  onClick={onNavigate}
                  activeProps={{
                    className:
                      "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_0_var(--sidebar-primary)]",
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    "hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{mod.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="px-3 pt-6 pb-2 text-[11px] font-semibold tracking-widest text-sidebar-foreground/45 uppercase">
          Administração
        </p>
        <ul className="space-y-1">
          <li>
            <Link to="/app/modulos" onClick={onNavigate} activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground">
              <Settings className="h-4 w-4" /> Módulos e plano
            </Link>
          </li>
        </ul>
      </nav>

      <div className="m-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-4">
        <p className="flex items-center gap-2 font-display text-sm font-semibold text-sidebar-accent-foreground">
          <Sparkles className="h-4 w-4" /> {DEMO_TENANT.plan}
        </p>
        <p className="mt-1 text-xs text-sidebar-foreground/60">
          {ACTIVE_MODULES.length} de {MODULES.length} módulos ativos
        </p>
      </div>
    </div>
  );
}
