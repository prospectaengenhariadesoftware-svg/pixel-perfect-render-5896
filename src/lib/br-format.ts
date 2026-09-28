export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function maskCpf(value: string) {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function maskCnpj(value: string) {
  return onlyDigits(value)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function maskCpfCnpj(value: string) {
  return onlyDigits(value).length > 11 ? maskCnpj(value) : maskCpf(value);
}

export function maskCep(value: string) {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
}

export function maskPhone(value: string) {
  const hasBrazilDdi = /^\s*\+\s*55/.test(value);
  let digits = onlyDigits(value);

  // Se o valor exibido já contém +55, retire o DDI antes de formatar.
  // Assim o estado editável contém efetivamente DDD + número e nunca duplica o DDI.
  if (hasBrazilDdi && digits.startsWith("55")) {
    digits = digits.slice(2);
  } else if (digits.length > 11 && digits.startsWith("55")) {
    // Compatibilidade com valores persistidos como 55DDDNÚMERO, sem o sinal +.
    digits = digits.slice(2);
  }

  digits = digits.slice(0, 11);
  if (!digits) return "";

  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);
  if (digits.length <= 2) return `+55 (${ddd}`;
  if (local.length <= 4) return `+55 (${ddd}) ${local}`;
  if (digits.length <= 10) return `+55 (${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
  return `+55 (${ddd}) ${local.slice(0, 5)}-${local.slice(5)}`;
}

export function maskNationalPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);
  if (local.length <= 4) return `(${ddd}) ${local}`;
  if (digits.length <= 10) return `(${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
  return `(${ddd}) ${local.slice(0, 5)}-${local.slice(5)}`;
}

export function documentKind(value: string): "cpf" | "cnpj" | null {
  const length = onlyDigits(value).length;
  if (length === 11) return "cpf";
  if (length === 14) return "cnpj";
  return null;
}

export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
