import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import type { ModuleKey } from "@/lib/modules";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Estado do tenant do usuário logado.
 * O tenant vem SEMPRE de `tenant_users` (filtrado por RLS para o próprio
 * usuário) — nunca da URL. Módulos ativos vêm de `tenant_modules`.
 * Esta camada só controla a interface; a proteção real é o RLS no banco.
 */
export interface AuditEntry {
  id: string;
  at: string;
  action: string;
  module: string;
  detail: string;
}

export type TenantStatus = "unconfigured" | "loading" | "no-tenant" | "ready" | "error";

export interface TenantInfo {
  id: string;
  name: string;
  isOwner: boolean;
}

interface TenantState {
  status: TenantStatus;
  error: string | null;
  user: User | null;
  tenant: TenantInfo | null;
  activeModules: ModuleKey[];
  isPlatformAdmin: boolean;
  isActive: (key: ModuleKey) => boolean;
  reload: () => void;
}

const Ctx = createContext<TenantState | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<TenantStatus>(
    isSupabaseConfigured ? "loading" : "unconfigured",
  );
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [activeModules, setActive] = useState<ModuleKey[]>([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      setStatus("loading");
      const { data: userData } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(userData.user);
      if (!userData.user) return setStatus("no-tenant");

      const { data: adminData, error: adminErr } = await supabase.rpc("is_platform_admin");
      if (cancelled) return;
      if (!adminErr) setIsPlatformAdmin(Boolean(adminData));

      const { data: memberships, error: mErr } = await supabase
        .from("tenant_users")
        .select("tenant_id, is_owner, tenants(name)")
        .eq("user_id", userData.user.id)
        .eq("status", "ativo")
        .limit(1);
      if (cancelled) return;
      if (mErr) {
        setError(mErr.message);
        return setStatus("error");
      }
      const m = memberships?.[0] as
        | {
            tenant_id: string;
            is_owner: boolean;
            tenants: { name: string } | { name: string }[] | null;
          }
        | undefined;
      if (!m) return setStatus("no-tenant");
      const t = Array.isArray(m.tenants) ? m.tenants[0] : m.tenants;
      setTenant({ id: m.tenant_id, name: t?.name ?? "Empresa", isOwner: m.is_owner });

      const { data: mods, error: modErr } = await supabase
        .from("tenant_modules")
        .select("module_key")
        .eq("tenant_id", m.tenant_id)
        .eq("enabled", true);
      if (cancelled) return;
      if (modErr) {
        setError(modErr.message);
        return setStatus("error");
      }
      const keys = (mods ?? []).map((r) => r.module_key as ModuleKey);
      setActive(Array.from(new Set<ModuleKey>(["dashboard", ...keys])));
      setStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const value = useMemo<TenantState>(
    () => ({
      status,
      error,
      user,
      tenant,
      activeModules,
      isPlatformAdmin,
      isActive: (k) => activeModules.includes(k),
      reload,
    }),
    [status, error, user, tenant, activeModules, isPlatformAdmin, reload],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTenant() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTenant deve ser usado dentro de TenantProvider");
  return v;
}
