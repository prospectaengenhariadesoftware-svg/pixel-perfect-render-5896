import {
  Building2,
  HardHat,
  LayoutDashboard,
  Package,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey = "dashboard" | "empresa" | "rh" | "suprimentos" | "obras" | "financeiro";

export interface ModuleDefinition {
  key: ModuleKey;
  name: string;
  description: string;
  path: string;
  icon: LucideIcon;
  /** Módulo base incluso em todos os planos (não contratável separadamente). */
  core: boolean;
  monthlyPrice: number;
}

export const MODULES: ModuleDefinition[] = [
  {
    key: "dashboard",
    name: "Home / Dashboard",
    description: "Visão geral consolidada da operação do tenant.",
    path: "/app/dashboard",
    icon: LayoutDashboard,
    core: true,
    monthlyPrice: 0,
  },
  {
    key: "empresa",
    name: "Empresa",
    description: "Dados cadastrais, filiais, documentos e certidões.",
    path: "/app/empresa",
    icon: Building2,
    core: false,
    monthlyPrice: 149,
  },
  {
    key: "rh",
    name: "Recursos Humanos",
    description: "Colaboradores, admissões, ASO, treinamentos e escalas.",
    path: "/app/rh",
    icon: Users,
    core: false,
    monthlyPrice: 349,
  },
  {
    key: "suprimentos",
    name: "Suprimentos",
    description: "Requisições, cotações, pedidos e almoxarifado.",
    path: "/app/suprimentos",
    icon: Package,
    core: false,
    monthlyPrice: 299,
  },
  {
    key: "obras",
    name: "Obras",
    description: "Contratos, medições, diários de obra e cronogramas.",
    path: "/app/obras",
    icon: HardHat,
    core: false,
    monthlyPrice: 399,
  },
  {
    key: "financeiro",
    name: "Financeiro",
    description: "Contas a pagar e receber, fluxo de caixa e centros de custo.",
    path: "/app/financeiro",
    icon: Wallet,
    core: false,
    monthlyPrice: 449,
  },
];

/** Escopo planejado de cada módulo (exibido nas páginas iniciais). */
export const MODULE_ROADMAP: Record<Exclude<ModuleKey, "dashboard">, string[]> = {
  empresa: [
    "Dados cadastrais e CNPJ",
    "Filiais e unidades",
    "Documentos e certidões com vencimento",
  ],
  rh: ["Cadastro de colaboradores", "Cargos e departamentos", "ASO, treinamentos e documentos"],
  suprimentos: ["Requisições de compra", "Cotações e fornecedores", "Pedidos e almoxarifado"],
  obras: ["Contratos e clientes", "Medições e diários de obra", "Cronogramas e avanço físico"],
  financeiro: ["Contas a pagar e a receber", "Fluxo de caixa", "Centros de custo por obra"],
};

export const getModule = (key: ModuleKey) => MODULES.find((m) => m.key === key)!;
