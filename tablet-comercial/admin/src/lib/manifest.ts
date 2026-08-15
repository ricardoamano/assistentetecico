import type { AppConfig, ManifestItem, ManifestSnapshot, MenuItem } from "./types";
import { publicUrl } from "./supabase";

/**
 * Monta o "manifest candidato": itens ativo=true AND midia_ok=true,
 * ordenados por `ordem`. Formato EXATO do contrato com os tablets.
 */
export function montaCandidato(config: AppConfig, itens: MenuItem[], versao: number): ManifestSnapshot {
  const elegiveis = itens
    .filter((i) => i.ativo && i.midia_ok)
    .sort((a, b) => a.ordem - b.ordem);

  return {
    versao,
    publicado_em: new Date().toISOString(),
    config: {
      nome_evento: config.nome_evento,
      logo_url: config.logo_url,
      fundo_url: config.fundo_url,
      idle_timeout_segundos: config.idle_timeout_segundos,
      idle_aviso_segundos: config.idle_aviso_segundos,
      poll_intervalo_minutos: config.poll_intervalo_minutos,
      texto_banner_update: config.texto_banner_update,
    },
    itens: elegiveis.map((i, idx) => ({
      id: i.id,
      ordem: idx + 1,
      titulo: i.titulo,
      subtitulo: i.subtitulo,
      tipo: i.tipo,
      url: i.tipo === "link" ? i.url_externa : publicUrl(i.storage_path),
      hash: i.arquivo_hash ?? null,
      bytes: i.arquivo_bytes ?? null,
      mime: i.arquivo_mime ?? null,
      thumb: publicUrl(i.thumb_path),
      cor_card: i.cor_card,
      modo_abertura: i.modo_abertura,
      fallback: publicUrl(i.fallback_path),
      requer_internet: i.tipo === "link",
    })),
  };
}

export interface Mudanca {
  tipo: "adicionado" | "removido" | "alterado" | "reordenado";
  titulo: string;
  detalhe?: string;
}

export interface Diff {
  mudancas: Mudanca[];
  itensAlterados: number;
  arquivosNovos: number;
  bytesNovos: number;
  configMudou: boolean;
}

function hashesDoSnapshot(snap: ManifestSnapshot | null): Set<string> {
  const set = new Set<string>();
  if (!snap) return set;
  for (const item of snap.itens ?? []) {
    if (item.hash) set.add(item.hash);
  }
  return set;
}

function camposConteudo(i: ManifestItem): string {
  return JSON.stringify([
    i.titulo,
    i.subtitulo,
    i.tipo,
    i.url,
    i.hash,
    i.cor_card,
    i.modo_abertura,
    i.fallback,
  ]);
}

/** DIFF entre o candidato e o snapshot da versão publicada. */
export function calculaDiff(candidato: ManifestSnapshot, anterior: ManifestSnapshot | null): Diff {
  const mudancas: Mudanca[] = [];
  const antigos = new Map<string, ManifestItem>(
    (anterior?.itens ?? []).map((i) => [i.id, i])
  );
  const novos = new Map<string, ManifestItem>(candidato.itens.map((i) => [i.id, i]));

  let itensAlterados = 0;

  // Adicionados e alterados
  for (const item of candidato.itens) {
    const antigo = antigos.get(item.id);
    if (!antigo) {
      mudancas.push({ tipo: "adicionado", titulo: item.titulo });
      itensAlterados++;
    } else if (camposConteudo(antigo) !== camposConteudo(item)) {
      const detalhes: string[] = [];
      if (antigo.titulo !== item.titulo) detalhes.push("título");
      if (antigo.subtitulo !== item.subtitulo) detalhes.push("subtítulo");
      if (antigo.hash !== item.hash || antigo.url !== item.url) detalhes.push("arquivo");
      if (antigo.cor_card !== item.cor_card) detalhes.push("cor");
      if (antigo.modo_abertura !== item.modo_abertura) detalhes.push("modo de abertura");
      if (antigo.fallback !== item.fallback) detalhes.push("fallback");
      mudancas.push({
        tipo: "alterado",
        titulo: item.titulo,
        detalhe: detalhes.length ? detalhes.join(", ") : undefined,
      });
      itensAlterados++;
    }
  }

  // Removidos
  for (const antigo of anterior?.itens ?? []) {
    if (!novos.has(antigo.id)) {
      mudancas.push({ tipo: "removido", titulo: antigo.titulo });
      itensAlterados++;
    }
  }

  // Reordenação: compara a sequência dos ids em comum
  const seqAntiga = (anterior?.itens ?? [])
    .filter((i) => novos.has(i.id))
    .map((i) => i.id);
  const seqNova = candidato.itens.filter((i) => antigos.has(i.id)).map((i) => i.id);
  if (seqAntiga.length > 1 && seqAntiga.join("|") !== seqNova.join("|")) {
    mudancas.push({ tipo: "reordenado", titulo: "Ordem dos cards alterada" });
  }

  // Arquivos novos = hash no candidato e ausente no snapshot (soma os bytes)
  const hashesAntigos = hashesDoSnapshot(anterior);
  const contados = new Set<string>();
  let arquivosNovos = 0;
  let bytesNovos = 0;
  for (const item of candidato.itens) {
    if (item.hash && !hashesAntigos.has(item.hash) && !contados.has(item.hash)) {
      contados.add(item.hash);
      arquivosNovos++;
      bytesNovos += item.bytes ?? 0;
    }
  }

  const configMudou =
    !!anterior && JSON.stringify(anterior.config) !== JSON.stringify(candidato.config);
  if (configMudou) {
    mudancas.push({ tipo: "alterado", titulo: "Configurações do evento", detalhe: "app_config" });
  }

  return { mudancas, itensAlterados, arquivosNovos, bytesNovos, configMudou };
}
