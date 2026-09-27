import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/cnpj/$cnpj")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const cnpj = String(params.cnpj ?? "").replace(/\D/g, "");
        if (cnpj.length !== 14) {
          return Response.json({ error: "CNPJ inválido." }, { status: 400 });
        }
        try {
          const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
            headers: { Accept: "application/json" },
          });
          if (!response.ok) {
            return Response.json({ error: "CNPJ não localizado." }, { status: response.status === 404 ? 404 : 502 });
          }
          const data = await response.json();
          return Response.json(data, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
        } catch {
          return Response.json({ error: "Serviço de consulta de CNPJ indisponível." }, { status: 502 });
        }
      },
    },
  },
});
