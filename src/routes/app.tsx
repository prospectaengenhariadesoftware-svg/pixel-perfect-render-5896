import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { AppSidebar } from "@/components/app/AppSidebar";
import { Topbar } from "@/components/app/Topbar";
import { ConnectionNotice } from "@/components/app/ConnectionNotice";
import { TenantProvider } from "@/lib/tenant-context";
import { getSupabase } from "@/lib/supabase";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export const Route = createFileRoute("/app")({
  // A sessão fica no navegador; o servidor não a enxerga.
  ssr: false,
  beforeLoad: async () => {
    const supabase = getSupabase();
    if (!supabase) return; // sem conexão configurada: modo de configuração, sem dados
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <TenantProvider>
      <div className="flex min-h-screen bg-background">
        <aside className="hidden w-[268px] shrink-0 lg:block">
          <div className="fixed top-0 left-0 h-screen w-[268px]">
            <AppSidebar />
          </div>
        </aside>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="w-[280px] border-0 p-0">
            <AppSidebar onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMenu={() => setMenuOpen(true)} />
          <main className="flex-1 space-y-6 px-4 py-6 lg:px-8 lg:py-8">
            <ConnectionNotice />
            <Outlet />
          </main>
        </div>
      </div>
    </TenantProvider>
  );
}
