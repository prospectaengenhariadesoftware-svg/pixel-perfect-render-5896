import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
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

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperar senha | Engenharia SaaS Modular" },
      {
        name: "description",
        content: "Receba um link seguro para redefinir a senha de acesso à plataforma.",
      },
      { property: "og:title", content: "Recuperar senha | Engenharia SaaS Modular" },
      { property: "og:description", content: "Redefina sua senha de acesso à plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({ email: z.string().email("Informe um e-mail válido") });

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Informe seu e-mail corporativo e enviaremos um link para definir uma nova senha."
    >
      {sent ? (
        <div className="rounded-lg border border-border bg-secondary/50 p-5">
          <MailCheck className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm font-medium">Link enviado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Se o e-mail estiver cadastrado, você receberá as instruções em instantes.
          </p>
          <Button variant="outline" className="mt-4 w-full" asChild>
            <Link to="/login">Voltar ao login</Link>
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async ({ email }) => {
              await getSupabase()?.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
              });
              setSent(true);
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail corporativo</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="nome@empresa.com.br" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={!isSupabaseConfigured || form.formState.isSubmitting}
            >
              Enviar link de recuperação
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link to="/login">Voltar ao login</Link>
            </Button>
          </form>
        </Form>
      )}
    </AuthShell>
  );
}
