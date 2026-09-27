import { createFileRoute } from "@tanstack/react-router";

const PROVIDERS = [
  (cnpj: string) => `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
  (cnpj: string) => `https://open.cnpja.biz/office/${cnpj}`,
];

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Engenharia-Inteligente/1.0",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function normalize(data: any) {
  // BrasilAPI
  if (data?.razao_social) return data;

  // OpenCNPJ / CNPJ.biz fallback
  const company = data?.company ?? {};
  const address = data?.address ?? {};
  const phones = data?.phones ?? [];
  const emails = data?.emails ?? [];
  return {
    razao_social: company.name ?? "",
    nome_fantasia: data?.alias ?? "",
    email: emails[0]?.address ?? "",
    ddd_telefone_1: phones[0] ? `${phones[0].area ?? ""}${phones[0].number ?? ""}` : "",
    cep: address.zip ?? "",
    logradouro: address.street ?? "",
    numero: address.number ?? "",
    complemento: address.details ?? "",
    bairro: address.district ?? "",
    municipio: address.city ?? "",
    uf: address.state ?? "",
  };
}

export const Route = createFileRoute("/api/cnpj/$cnpj")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const cnpj = String(params.cnpj ?? "").replace(/\D/g, "");
        if (cnpj.length !== 14) {
          return Response.json({ error: "CNPJ inválido." }, { status: 400 });
        }

        for (const provider of PROVIDERS) {
          try {
            const data = await fetchJson(provider(cnpj));
            if (data) {
              return Response.json(normalize(data), {
                headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
              });
            }
          } catch {
            // Tenta o próximo provedor sem expor detalhes internos ao cliente.
          }
        }

        return Response.json(
          { error: "Não foi possível consultar o CNPJ neste momento. Tente novamente em instantes." },
          { status: 502 },
        );
      },
    },
  },
});
