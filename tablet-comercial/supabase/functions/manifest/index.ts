// ============================================================
// Edge Function GET /manifest — contrato servidor → tablets
//
// Serve SEMPRE a última versão PUBLICADA (snapshot congelado em
// `publicacoes`), nunca o rascunho das tabelas. Editar no admin
// não muda nada aqui até o gestor clicar em Publicar.
//
// * ETag + If-None-Match: em rede ruim, o poll custa poucos bytes
//   (o tablet recebe 304 sem corpo quando nada mudou).
// * Cache-Control: no-store — o cache de conteúdo é do app, não
//   do navegador.
// * A decisão de baixar arquivo é sempre por `hash`; trocar ordem
//   ou título não rebaixa arquivo nenhum.
//
// Deploy: supabase functions deploy manifest --no-verify-jwt
// (os tablets não têm login — a função é pública, só de leitura)
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, if-none-match",
};

const JSON_HEADERS = {
  ...CORS,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

// storage_path é relativo ao bucket "conteudo" (ex.: "9f2a….pdf")
function urlPublica(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/conteudo/${path}`;
}

interface ItemSnapshot {
  id: string;
  ordem: number;
  titulo: string;
  subtitulo: string | null;
  tipo: "pdf" | "video" | "link" | "imagem";
  url_externa: string | null;
  modo_abertura: "navegar" | "iframe";
  storage_path: string | null;
  hash: string | null;
  bytes: number | null;
  mime: string | null;
  thumb_path: string | null;
  cor_card: string | null;
  fallback_path: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ erro: "Método não permitido." }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  try {
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: cfg, error: erroCfg } = await db
      .from("app_config")
      .select("versao_publicada")
      .eq("id", 1)
      .single();
    if (erroCfg || !cfg) {
      throw new Error(`app_config não encontrada: ${erroCfg?.message ?? "sem dados"}`);
    }

    const { data: pub, error: erroPub } = await db
      .from("publicacoes")
      .select("snapshot")
      .eq("versao", cfg.versao_publicada)
      .single();
    if (erroPub || !pub) {
      throw new Error(
        `publicação v${cfg.versao_publicada} não encontrada: ${erroPub?.message ?? "sem dados"}`,
      );
    }

    const snap = pub.snapshot as {
      versao: number;
      publicado_em: string;
      config: Record<string, unknown>;
      itens: ItemSnapshot[];
    };

    // A versão identifica o snapshot de forma única (nunca é reutilizada),
    // então ela basta como ETag.
    const etag = `"v${snap.versao}"`;
    const headers = { ...JSON_HEADERS, ETag: etag };

    const ifNoneMatch = req.headers.get("if-none-match") ?? "";
    if (ifNoneMatch.includes(etag)) {
      return new Response(null, { status: 304, headers });
    }

    const body = {
      versao: snap.versao,
      publicado_em: snap.publicado_em,
      config: snap.config,
      itens: (snap.itens ?? []).map((item) => ({
        id: item.id,
        ordem: item.ordem,
        titulo: item.titulo,
        subtitulo: item.subtitulo ?? null,
        tipo: item.tipo,
        url: item.tipo === "link" ? (item.url_externa ?? null) : urlPublica(item.storage_path),
        hash: item.hash ?? null,
        bytes: item.bytes ?? null,
        mime: item.mime ?? null,
        thumb: urlPublica(item.thumb_path),
        cor_card: item.cor_card ?? "verde_escuro",
        modo_abertura: item.modo_abertura ?? "navegar",
        fallback: urlPublica(item.fallback_path),
        requer_internet: item.tipo === "link",
      })),
    };

    return new Response(JSON.stringify(body), { status: 200, headers });
  } catch (erro) {
    console.error("manifest:", erro);
    return new Response(
      JSON.stringify({ erro: "Falha ao montar o manifest.", detalhe: String(erro) }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
});
