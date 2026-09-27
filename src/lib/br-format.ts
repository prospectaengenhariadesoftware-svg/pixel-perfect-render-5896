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
  const rawDigits = onlyDigits(value);
  const digits = (rawDigits.startsWith("55") && rawDigits.length > 11 ? rawDigits.slice(2) : rawDigits).slice(0, 11);
  if (!digits) return "";

  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);
  if (digits.length <= 2) return `+55 (${ddd}`;
  if (local.length <= 4) return `+55 (${ddd}) ${local}`;
  if (digits.length <= 10) return `+55 (${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
  return `+55 (${ddd}) ${local.slice(0, 5)}-${local.slice(5)}`;
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
