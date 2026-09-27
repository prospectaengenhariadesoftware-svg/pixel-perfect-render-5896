import { useNavigate } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getSupabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant-context";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, tenant, status } = useTenant();
  const navigate = useNavigate();
  const email = user?.email ?? "";
  const initials = email ? email.slice(0, 2).toUpperCase() : "—";

  async function signOut() {
    await getSupabase()?.auth.signOut();
    await navigate({ to: "/login", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMenu}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex min-w-0 flex-col">
        <span className="truncate font-display text-sm font-semibold">
          {tenant?.name ??
            (status === "unconfigured" ? "Nenhuma empresa conectada" : "Carregando empresa...")}
        </span>
        <span className="text-xs text-muted-foreground">
          {tenant ? (tenant.isOwner ? "Administrador da empresa" : "Membro") : "—"}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {user && (
          <>
            <Separator orientation="vertical" className="mx-2 hidden h-8 sm:block" />
            <div className="flex items-center gap-2 pl-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[200px] truncate text-sm font-medium sm:block">
                {email}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
