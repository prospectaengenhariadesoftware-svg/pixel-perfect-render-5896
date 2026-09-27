import { createFileRoute } from "@tanstack/react-router";

type CepResult = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 Engenharia-Inteligente/1.0",
      },
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
    });
    if (!response.ok) return null;
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeBrasil(data: any, cep: string): CepResult | null {
  if (!data || (!data.city && !data.state)) return null;
  return {
    cep: data.cep ?? cep,
    street: data.street ?? "",
    neighborhood: data.neighborhood ?? "",
    city: data.city ?? "",
    state: data.state ?? "",
  };
}

function normalizeViaCep(data: any, cep: string): CepResult | null {
  if (!data || data.erro) return null;
  return {
    cep: data.cep ?? cep,
    street: data.logradouro ?? "",
    neighborhood: data.bairro ?? "",
    city: data.localidade ?? "",
    state: data.uf ?? "",
  };
}

function normalizeAwesome(data: any, cep: string): CepResult | null {
  if (!data || (!data.city && !data.state)) return null;
  return {
    cep: data.cep ?? cep,
    street: data.address ?? "",
    neighborhood: data.district ?? "",
    city: data.city ?? "",
    state: data.state ?? "",
  };
}

export const Route = createFileRoute("/api/cep/$cep")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const cep = String(params.cep ?? "").replace(/\D/g, "");
        if (cep.length !== 8) {
          return Response.json({ error: "CEP inválido." }, { status: 400 });
        }

        const providers: Array<{
          url: string;
          normalize: (data: any, cep: string) => CepResult | null;
        }> = [
          { url: `https://brasilapi.com.br/api/cep/v2/${cep}`, normalize: normalizeBrasil },
          { url: `https://viacep.com.br/ws/${cep}/json/`, normalize: normalizeViaCep },
          { url: `https://cep.awesomeapi.com.br/json/${cep}`, normalize: normalizeAwesome },
        ];

        for (const provider of providers) {
          try {
            const data = await fetchJson(provider.url);
            const normalized = provider.normalize(data, cep);
            if (normalized) {
              return Response.json(normalized, {
                headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
              });
            }
          } catch {
            // Falha isolada do provedor: tenta o próximo sem expor detalhes internos.
          }
        }

        return Response.json(
          { error: "Não foi possível consultar o CEP neste momento. Tente novamente em instantes." },
          { status: 502 },
        );
      },
    },
  },
});
