import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha | Engenharia SaaS Modular" },
      { name: "description", content: "Defina uma nova senha de acesso à plataforma." },
      { property: "og:title", content: "Nova senha | Engenharia SaaS Modular" },
      { property: "og:description", content: "Defina uma nova senha de acesso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("A senha deve ter ao menos 8 caracteres.");
    const supabase = getSupabase();
    if (!supabase) return setError("Conexão com o banco não configurada.");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError("Link inválido ou expirado. Solicite uma nova recuperação.");
    await navigate({ to: "/app/dashboard" });
  }

  return (
    <AuthShell
      title="Definir nova senha"
      subtitle="Escolha uma senha forte com ao menos 8 caracteres."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pw">Nova senha</Label>
          <Input
            id="pw"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          Salvar nova senha
        </Button>
      </form>
    </AuthShell>
  );
}
