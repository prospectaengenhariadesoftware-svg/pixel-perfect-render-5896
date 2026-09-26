import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="bg-gradient-ink relative hidden flex-col justify-between p-12 text-sidebar-foreground lg:flex">
        <div className="grid-blueprint pointer-events-none absolute inset-0" aria-hidden />
        <Link to="/" className="relative flex items-center gap-3">
          <span className="bg-gradient-brand flex h-10 w-10 items-center justify-center rounded-md font-display text-sm font-bold text-primary-foreground">
            ES
          </span>
          <span className="font-display text-base font-semibold">Engenharia SaaS Modular</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl leading-tight font-semibold text-white">
            Gestão de engenharia, módulo por módulo.
          </h2>
          <p className="mt-4 text-sm text-sidebar-foreground/70">
            Obras, suprimentos, recursos humanos e financeiro em uma plataforma multi-tenant, com
            isolamento total de dados por empresa.
          </p>
        </div>

        <p className="relative text-xs text-sidebar-foreground/45">
          Infraestrutura própria · PostgreSQL com Row Level Security
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao site
          </Link>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
