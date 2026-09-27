import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { z } from "zod";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar | Engenharia SaaS Modular" },
      {
        name: "description",
        content: "Acesse o painel da sua empresa no Engenharia SaaS Modular.",
      },
      { property: "og:title", content: "Entrar | Engenharia SaaS Modular" },
      { property: "og:description", content: "Acesso ao painel multi-tenant de engenharia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
});

function LoginPage() {
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const [authError, setAuthError] = useState<string | null>(null);

  async function onSubmit(values: z.infer<typeof schema>) {
    setAuthError(null);
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setAuthError("E-mail ou senha incorretos.");
      return;
    }
    await navigate({ to: "/app/dashboard" });
  }

  return (
    <AuthShell
      title="Entrar na plataforma"
      subtitle="Use as credenciais corporativas fornecidas pelo administrador da sua empresa."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail corporativo</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="nome@empresa.com.br"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Senha</FormLabel>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {authError && <p className="text-sm font-medium text-destructive">{authError}</p>}
          <Button
            type="submit"
            className="w-full"
            disabled={!isSupabaseConfigured || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Entrar <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
          <Button asChild type="button" variant="outline" className="w-full">
            <a href="/cadastro">Não tenho conta</a>
          </Button>
        </form>
      </Form>

      <p className="mt-6 flex items-start gap-2 rounded-md border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        {isSupabaseConfigured
          ? "Acesso protegido. Cada empresa vê somente os próprios dados."
          : "O login será liberado assim que o banco de dados da plataforma for conectado."}
      </p>
    </AuthShell>
  );
}
