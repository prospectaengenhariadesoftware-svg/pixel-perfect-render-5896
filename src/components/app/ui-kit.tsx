import { useState, type ReactNode } from "react";
import { Inbox, Loader2, Search, type LucideIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AuditEntry } from "@/lib/tenant-context";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">{eyebrow}</p>
        )}
        <h1 className="mt-1 text-3xl font-semibold">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: LucideIcon }) {
  return (
    <Card className="bg-gradient-surface shadow-card border-border/70">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/60 text-accent-foreground">
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

const statusTone: Record<string, string> = {
  ativo: "border-primary/30 bg-primary/10 text-primary",
  pendente: "border-border bg-muted text-muted-foreground",
  inativo: "border-border bg-secondary text-secondary-foreground",
  bloqueado: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", statusTone[status] ?? statusTone["pendente"])}>
      {status}
    </Badge>
  );
}

export function DemoBadge() {
  return (
    <Badge variant="outline" className="border-accent bg-accent/40 text-accent-foreground">
      Demonstração visual
    </Badge>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/60 text-accent-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 font-display font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function FilterBar({ value, onChange, placeholder = "Filtrar..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative max-w-xs">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 pl-9" />
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({ columns, rows }: { columns: Column<T>[]; rows: T[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={c.className}>{c.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              {columns.map((c) => (
                <TableCell key={c.key} className={c.className}>{c.render(r)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface FormField {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
}

export function FormModal({
  open,
  onOpenChange,
  title,
  description,
  fields,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  fields: FormField[];
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const missing = fields.find((f) => f.required && !values[f.name]?.trim());
    if (missing) {
      setError(`Preencha o campo "${missing.label}".`);
      return;
    }
    onSubmit(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim().slice(0, 200)])));
    setValues({});
    setError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={f.name}>{f.label}{f.required && " *"}</Label>
              <Input
                id={f.name}
                placeholder={f.placeholder}
                maxLength={200}
                value={values[f.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              />
            </div>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma ação registrada ainda.</p>;
  }
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {entries.slice(0, 12).map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full bg-primary" />
          <p className="text-sm font-medium">{e.action}</p>
          <p className="text-xs text-muted-foreground">
            {e.detail} · {new Date(e.at).toLocaleString("pt-BR")}
          </p>
        </li>
      ))}
    </ol>
  );
}
