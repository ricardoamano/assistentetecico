// =============================================================
// Tablet Comercial — Edge Function GET /manifest
//
// Contrato servidor → tablets. Serve SEMPRE a última versão
// PUBLICADA (snapshot gravado em `publicacoes`), nunca rascunho.
//
// - ETag = "v{versao}" + suporte a If-None-Match: em rede ruim,
//   o poll dos tablets custa poucos bytes (304 sem corpo).
// - Cache-Control: no-store — o cache é nosso (Cache API do
//   tablet), não do navegador.
// - Roda com a service role (ignora RLS); os tablets chamam esta
//   função sem chave (deploy com verify_jwt = false).
// =============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, if-none-match",
  "Access-Control-Expose-Headers": "etag",
};

function json(corpo: unknown, status: number, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "GET") {
    return json({ erro: "Método não permitido" }, 405);
  }

  const { data: config, error: erroConfig } = await supabase
    .from("app_config")
    .select("versao_publicada")
    .eq("id", 1)
    .single();

  if (erroConfig || !config) {
    return json({ erro: "Configuração não encontrada. Rode as migrations e o seed." }, 500);
  }

  const etag = `"v${config.versao_publicada}"`;

  // Poll barato: versão não mudou → 304 sem corpo
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { ...CORS, ETag: etag, "Cache-Control": "no-store" },
    });
  }

  const { data: pub, error: erroPub } = await supabase
    .from("publicacoes")
    .select("snapshot")
    .eq("versao", config.versao_publicada)
    .single();

  if (erroPub || !pub) {
    return json(
      { erro: `Publicação v${config.versao_publicada} não encontrada. Rode o seed.` },
      500,
    );
  }

  return json(pub.snapshot, 200, { ETag: etag });
});
