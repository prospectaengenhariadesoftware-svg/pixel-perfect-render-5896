import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_ACTIVE_MODULES, type ModuleKey } from "@/lib/modules";

/**
 * Estado do tenant no navegador — DEMONSTRAÇÃO VISUAL.
 * Quando o Supabase próprio for conectado, os módulos ativos virão de
 * `tenant_modules` e as trilhas de auditoria de `tenant_audit_logs`,
 * sempre validados no servidor (RLS + checagem de módulo contratado).
 */
export interface AuditEntry {
  id: string;
  at: string;
  action: string;
  module: ModuleKey | "plataforma";
  detail: string;
}

interface TenantState {
  activeModules: ModuleKey[];
  isActive: (key: ModuleKey) => boolean;
  toggleModule: (key: ModuleKey) => void;
  audit: AuditEntry[];
  logAudit: (e: Omit<AuditEntry, "id" | "at">) => void;
}

const Ctx = createContext<TenantState | null>(null);
const STORAGE_KEY = "es-demo-tenant-v1";

export function TenantProvider({ children }: { children: ReactNode }) {
  const [activeModules, setActive] = useState<ModuleKey[]>(DEFAULT_ACTIVE_MODULES);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.activeModules)) setActive(parsed.activeModules);
        if (Array.isArray(parsed.audit)) setAudit(parsed.audit);
      }
    } catch {
      /* ignora estado corrompido */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeModules, audit }));
  }, [activeModules, audit, loaded]);

  const logAudit = useCallback((e: Omit<AuditEntry, "id" | "at">) => {
    setAudit((prev) =>
      [{ ...e, id: crypto.randomUUID(), at: new Date().toISOString() }, ...prev].slice(0, 200),
    );
  }, []);

  const toggleModule = useCallback(
    (key: ModuleKey) => {
      if (key === "dashboard") return;
      setActive((prev) => {
        const on = prev.includes(key);
        logAudit({
          action: on ? "Módulo desativado" : "Módulo ativado",
          module: "plataforma",
          detail: key,
        });
        return on ? prev.filter((k) => k !== key) : [...prev, key];
      });
    },
    [logAudit],
  );

  const value = useMemo<TenantState>(
    () => ({
      activeModules,
      isActive: (k) => activeModules.includes(k),
      toggleModule,
      audit,
      logAudit,
    }),
    [activeModules, audit, toggleModule, logAudit],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTenant() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTenant deve ser usado dentro de TenantProvider");
  return v;
}
