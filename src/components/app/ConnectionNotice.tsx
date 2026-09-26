import { AlertTriangle, DatabaseZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/lib/tenant-context";

/** Aviso honesto sobre o estado da conexão — nunca exibe dados inventados. */
export function ConnectionNotice() {
  const { status, error, reload } = useTenant();
  if (status === "ready" || status === "loading") return null;

  const content = {
    unconfigured: {
      icon: DatabaseZap,
      title: "Modo de configuração",
      text: "O Supabase ainda não está conectado. A estrutura está pronta, mas nenhum dado é exibido até a conexão ser feita.",
    },
    "no-tenant": {
      icon: AlertTriangle,
      title: "Usuário sem empresa vinculada",
      text: "Seu acesso não está associado a nenhuma empresa ativa. Peça ao administrador para vincular seu usuário.",
    },
    error: {
      icon: AlertTriangle,
      title: "Não foi possível carregar os dados da empresa",
      text: error ?? "Erro desconhecido.",
    },
  }[status];
  const Icon = content.icon;

  return (
    <div className="mx-auto flex w-full max-w-7xl items-start gap-3 rounded-lg border border-accent bg-accent/30 p-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="flex-1">
        <p className="text-sm font-semibold">{content.title}</p>
        <p className="text-sm text-muted-foreground">{content.text}</p>
      </div>
      {status === "error" && (
        <Button size="sm" variant="outline" onClick={reload}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
