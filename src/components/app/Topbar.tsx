import { Link } from "@tanstack/react-router";
import { Bell, LogOut, Menu, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { DEMO_TENANT } from "@/lib/modules";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
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

      <div className="hidden min-w-0 flex-col lg:flex">
        <span className="truncate font-display text-sm font-semibold">{DEMO_TENANT.name}</span>
        <span className="text-xs text-muted-foreground">{DEMO_TENANT.plan}</span>
      </div>

      <Separator orientation="vertical" className="mx-2 hidden h-8 lg:block" />

      <div className="relative max-w-sm flex-1">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar obras, colaboradores, pedidos..." className="h-9 pl-9" />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Notificações">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 pl-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
              AR
            </AvatarFallback>
          </Avatar>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-medium">{DEMO_TENANT.userName}</span>
            <span className="block text-xs text-muted-foreground">{DEMO_TENANT.userRole}</span>
          </span>
        </div>
        <Button variant="ghost" size="icon" asChild aria-label="Sair">
          <Link to="/login">
            <LogOut className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
