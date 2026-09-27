import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/cep/$cep")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const cep = String(params.cep ?? "").replace(/\D/g, "");
        if (cep.length !== 8) {
          return Response.json({ error: "CEP inválido." }, { status: 400 });
        }
        try {
          const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, {
            headers: { Accept: "application/json" },
          });
          if (!response.ok) {
            return Response.json({ error: "CEP não localizado." }, { status: response.status === 404 ? 404 : 502 });
          }
          const data = await response.json();
          return Response.json(data, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
        } catch {
          return Response.json({ error: "Serviço de consulta de CEP indisponível." }, { status: 502 });
        }
      },
    },
  },
});
