import { createFileRoute } from "@tanstack/react-router";

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Engenharia-Inteligente/1.0" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export const Route = createFileRoute("/api/cep/$cep")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const cep = String(params.cep ?? "").replace(/\D/g, "");
        if (cep.length !== 8) return Response.json({ error: "CEP inválido." }, { status: 400 });

        try {
          const brasil = await fetchJson(`https://brasilapi.com.br/api/cep/v2/${cep}`);
          if (brasil) return Response.json(brasil, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
        } catch { /* tenta fallback */ }

        try {
          const via = await fetchJson(`https://viacep.com.br/ws/${cep}/json/`);
          if (via && !via.erro) {
            return Response.json({
              cep: via.cep ?? cep,
              street: via.logradouro ?? "",
              neighborhood: via.bairro ?? "",
              city: via.localidade ?? "",
              state: via.uf ?? "",
            }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
          }
        } catch { /* retorna mensagem única abaixo */ }

        return Response.json({ error: "Não foi possível consultar o CEP neste momento. Tente novamente em instantes." }, { status: 502 });
      },
    },
  },
});
