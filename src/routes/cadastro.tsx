import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { documentKind, maskCep, maskCnpj, maskCpf, maskPhone, onlyDigits, slugify } from "@/lib/br-format";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta | Engenharia SaaS Modular" },
      { name: "description", content: "Cadastre sua empresa e crie o primeiro acesso." },
    ],
  }),
  component: RegisterPage,
});

type OwnerContact = { name: string; phone: string; email: string; function: string };

type RegisterForm = {
  personType: "pj" | "pf";
  name: string;
  legalName: string;
  slug: string;
  document: string;
  companyEmail: string;
  companyPhone: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  owners: OwnerContact[];
  password: string;
  confirmPassword: string;
};

const emptyOwner = (): OwnerContact => ({ name: "", phone: "", email: "", function: "Proprietário" });

const initialForm = (): RegisterForm => ({
  personType: "pj",
  name: "",
  legalName: "",
  slug: "",
  document: "",
  companyEmail: "",
  companyPhone: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  owners: [emptyOwner()],
  password: "",
  confirmPassword: "",
});

function firstAccessOwner(owners: OwnerContact[]) {
  return owners.find((owner) => owner.name.trim() && owner.email.trim()) ?? null;
}

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterForm>(() => initialForm());
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState<string | null>(null);

  const accessOwner = useMemo(() => firstAccessOwner(form.owners), [form.owners]);

  function update<K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateOwner(index: number, field: keyof OwnerContact, value: string) {
    setForm((current) => ({
      ...current,
      owners: current.owners.map((owner, ownerIndex) =>
        ownerIndex === index ? { ...owner, [field]: field === "phone" ? maskPhone(value) : value } : owner,
      ),
    }));
  }

  async function lookupCep(cepValue: string) {
    const digits = onlyDigits(cepValue);
    if (digits.length !== 8) return;
    setLookingUp("cep");
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`);
      if (!response.ok) throw new Error("CEP não localizado.");
      const data = (await response.json()) as { street?: string; neighborhood?: string; city?: string; state?: string };
      setForm((current) => ({
        ...current,
        street: data.street ?? "",
        neighborhood: data.neighborhood ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
      }));
      toast.success("Endereço preenchido pelo CEP", { description: "Complete apenas número e complemento." });
    } catch (error) {
      toast.error("Não foi possível buscar o CEP", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setLookingUp(null);
    }
  }

  async function lookupCnpj(documentValue: string) {
    const digits = onlyDigits(documentValue);
    if (digits.length !== 14) return;
    setLookingUp("cnpj");
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!response.ok) throw new Error("CNPJ não localizado na Receita/BrasilAPI.");
      const data = (await response.json()) as {
        razao_social?: string;
        nome_fantasia?: string;
        email?: string | null;
        ddd_telefone_1?: string | null;
        cep?: string | null;
        logradouro?: string | null;
        numero?: string | null;
        complemento?: string | null;
        bairro?: string | null;
        municipio?: string | null;
        uf?: string | null;
        qsa?: Array<{ nome_socio?: string; qualificacao_socio?: string }>;
      };
      const owners = (data.qsa ?? [])
        .slice(0, 8)
        .map((owner) => ({
          name: owner.nome_socio ?? "",
          phone: "",
          email: "",
          function: owner.qualificacao_socio ?? "Sócio/Proprietário",
        }))
        .filter((owner) => owner.name.trim());
      setForm((current) => ({
        ...current,
        personType: "pj",
        name: data.nome_fantasia || data.razao_social || current.name,
        slug: current.slug || slugify(data.nome_fantasia || data.razao_social || current.name),
        legalName: data.razao_social ?? current.legalName,
        companyEmail: data.email ?? current.companyEmail,
        companyPhone: maskPhone(data.ddd_telefone_1 ?? current.companyPhone),
        cep: maskCep(data.cep ?? current.cep),
        street: data.logradouro ?? current.street,
        number: data.numero && data.numero !== "S/N" ? data.numero : current.number,
        complement: data.complemento ?? current.complement,
        neighborhood: data.bairro ?? current.neighborhood,
        city: data.municipio ?? current.city,
        state: data.uf ?? current.state,
        owners: owners.length ? owners : current.owners,
      }));
      toast.success("Dados da Receita preenchidos", { description: "Complete número, complemento e e-mail do sócio que fará o acesso." });
    } catch (error) {
      toast.error("Não foi possível buscar o CNPJ", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setLookingUp(null);
    }
  }

  async function submit() {
    const supabase = getSupabase();
    if (!supabase) return;
    const kind = documentKind(form.document);
    const owner = firstAccessOwner(form.owners);
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Informe o nome da empresa e o slug.");
      return;
    }
    if (!kind) {
      toast.error("Informe CPF ou CNPJ completo.");
      return;
    }
    if (!form.cep.trim() || !form.number.trim()) {
      toast.error("Informe CEP e número do endereço.");
      return;
    }
    if (!owner) {
      toast.error("Informe ao menos um proprietário/responsável com nome e e-mail.");
      return;
    }
    if (form.password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }

    const owners = form.owners.filter((item) => item.name.trim());
    const companyData = {
      personType: form.personType,
      legalName: form.personType === "pj" ? form.legalName.trim() : form.name.trim(),
      document: form.document.trim(),
      email: form.companyEmail.trim(),
      phone: form.companyPhone.trim(),
      cep: form.cep.trim(),
      street: form.street.trim(),
      number: form.number.trim(),
      complement: form.complement.trim(),
      neighborhood: form.neighborhood.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      owners,
    };

    setSaving(true);
    try {
      const { error } = await supabase.rpc("register_company", {
        _owner_email: owner.email.trim(),
        _password: form.password,
        _name: form.name.trim(),
        _slug: form.slug.trim(),
        _modules: [],
        _company_data: companyData,
      });
      if (error) {
        toast.error("Não foi possível criar a conta", { description: error.message });
        return;
      }
      const login = await supabase.auth.signInWithPassword({ email: owner.email.trim(), password: form.password });
      if (login.error) {
        toast.success("Conta criada", { description: "Use o e-mail e senha cadastrados para entrar." });
        await navigate({ to: "/login" });
        return;
      }
      toast.success("Conta criada com sucesso", { description: form.name.trim() });
      await navigate({ to: "/app/dashboard" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthShell title="Criar conta da empresa" subtitle="Cadastre CNPJ/CPF, endereço e o primeiro responsável pelo acesso.">
      <div className="space-y-5">
        <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="radio" checked={form.personType === "pj"} onChange={() => update("personType", "pj")} />
            Pessoa jurídica / CNPJ
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="radio" checked={form.personType === "pf"} onChange={() => update("personType", "pf")} />
            Pessoa física / CPF
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>{form.personType === "pj" ? "CNPJ" : "CPF"}</Label>
            <div className="relative">
              <Input
                value={form.document}
                inputMode="numeric"
                onChange={(event) => {
                  const document = form.personType === "pj" ? maskCnpj(event.target.value) : maskCpf(event.target.value);
                  setForm((current) => ({ ...current, document }));
                  if (onlyDigits(document).length === 14) void lookupCnpj(document);
                }}
                placeholder={form.personType === "pj" ? "00.000.000/0000-00" : "000.000.000-00"}
              />
              {lookingUp === "cnpj" ? <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" /> : <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{form.personType === "pj" ? "Nome fantasia" : "Nome completo"}</Label>
            <Input
              value={form.name}
              onChange={(event) => {
                const name = event.target.value;
                setForm((current) => ({ ...current, name, slug: current.slug ? current.slug : slugify(name) }));
              }}
            />
          </div>
          {form.personType === "pj" ? (
            <div className="grid gap-2 sm:col-span-2">
              <Label>Razão social</Label>
              <Input value={form.legalName} onChange={(event) => update("legalName", event.target.value)} />
            </div>
          ) : null}
          <div className="grid gap-2 sm:col-span-2">
            <Label>Slug da empresa</Label>
            <Input value={form.slug} onChange={(event) => update("slug", slugify(event.target.value))} placeholder="minha-empresa" />
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-sm font-semibold">Contato da empresa</p>
          <p className="text-xs text-muted-foreground">Para CNPJ, e-mail e telefone vêm da Receita/BrasilAPI quando disponíveis.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Input value={form.companyEmail || "E-mail não informado na Receita"} readOnly className="bg-muted" />
            <Input value={form.companyPhone || "Telefone não informado na Receita"} readOnly className="bg-muted" />
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-sm font-semibold">Endereço</p>
          <p className="text-xs text-muted-foreground">Digite o CEP para preencher rua, bairro, cidade e UF. Preencha apenas número e complemento.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Input value={form.cep} inputMode="numeric" onChange={(event) => { const cep = maskCep(event.target.value); update("cep", cep); if (onlyDigits(cep).length === 8) void lookupCep(cep); }} placeholder="00000-000" />
            <Input value={form.number} onChange={(event) => update("number", event.target.value)} placeholder="Número" />
            <Input value={form.street} readOnly className="bg-muted" placeholder="Rua / logradouro" />
            <Input value={form.neighborhood} readOnly className="bg-muted" placeholder="Bairro" />
            <Input value={form.city} readOnly className="bg-muted" placeholder="Cidade" />
            <Input value={form.state} readOnly className="bg-muted" placeholder="UF" />
            <Input className="sm:col-span-2" value={form.complement} onChange={(event) => update("complement", event.target.value)} placeholder="Complemento" />
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Proprietários / sócios</p>
              <p className="text-xs text-muted-foreground">O primeiro sócio com e-mail será o dono do acesso inicial.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setForm((current) => ({ ...current, owners: [...current.owners, emptyOwner()] }))}>Adicionar</Button>
          </div>
          <div className="mt-3 space-y-3">
            {form.owners.map((owner, index) => (
              <div key={index} className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
                <Input value={owner.name} onChange={(event) => updateOwner(index, "name", event.target.value)} placeholder="Nome" />
                <Input value={owner.function} onChange={(event) => updateOwner(index, "function", event.target.value)} placeholder="Função" />
                <Input value={owner.phone} onChange={(event) => updateOwner(index, "phone", event.target.value)} placeholder="Telefone" />
                <Input type="email" value={owner.email} onChange={(event) => updateOwner(index, "email", event.target.value)} placeholder="E-mail do acesso" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-sm font-semibold">Senha do primeiro acesso</p>
          <p className="text-xs text-muted-foreground">E-mail de login: {accessOwner?.email || "preencha o e-mail de um sócio/responsável"}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Input type="password" value={form.password} onChange={(event) => update("password", event.target.value)} placeholder="Senha" autoComplete="new-password" />
            <Input type="password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} placeholder="Confirmar senha" autoComplete="new-password" />
          </div>
        </div>

        <Button className="w-full" onClick={() => void submit()} disabled={!isSupabaseConfigured || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Criar conta <ArrowRight className="ml-1 h-4 w-4" /></>}
        </Button>

        <p className="flex items-start gap-2 rounded-md border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          O cadastro cria a empresa, o primeiro usuário dono e mantém os dados isolados por empresa.
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Já tenho conta. <Link to="/login" className="font-medium text-primary hover:underline">Entrar</Link>
        </p>
      </div>
    </AuthShell>
  );
}
