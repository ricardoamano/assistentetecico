import type { Manifest, ManifestItem, StatusDownload } from '../types';
import { nomeCacheConteudo, CONTEUDO_PREFIX } from '../config';
import { fetchComTimeout } from './fetchTimeout';
import { registrarErro } from './erros';
import { getEstado, setEstado } from './store';

/** Um arquivo a garantir no cache de conteúdo. */
interface Alvo {
  url: string;
  hash: string | null;
  bytes: number | null;
  itemId: string | null; // id do item do manifest (para status na UI); null p/ fundo/logo
}

/** Lista tudo que precisa estar no cache para uma versão do manifest. */
export function listarAlvos(manifest: Manifest): Alvo[] {
  const alvos: Alvo[] = [];
  const vistos = new Set<string>();
  const add = (url: string | null, hash: string | null, bytes: number | null, itemId: string | null) => {
    if (!url || vistos.has(url)) return;
    vistos.add(url);
    alvos.push({ url, hash, bytes, itemId });
  };

  for (const item of manifest.itens) {
    if (item.tipo !== 'link') add(item.url, item.hash, item.bytes, item.id);
    add(item.thumb, null, null, item.id);
    // fallback: PDF alternativo para links offline — precisa estar no cache
    add(item.fallback, null, null, item.id);
  }
  add(manifest.config.fundo_url, null, null, null);
  add(manifest.config.logo_url, null, null, null);
  return alvos;
}

function atualizarStatus(itemId: string | null, status: StatusDownload): void {
  if (!itemId) return;
  const dl = getEstado().download;
  setEstado({
    download: { ...dl, statusPorItem: { ...dl.statusPorItem, [itemId]: status } },
  });
}

function atualizarPctTotal(baixados: number, total: number): void {
  const dl = getEstado().download;
  setEstado({
    download: { ...dl, pctTotal: total > 0 ? Math.round((baixados / total) * 100) : 100 },
  });
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Baixa uma URL lendo o corpo em stream (progresso real) e grava no cache.
 * 3 tentativas com backoff exponencial (1s, 3s, 9s).
 */
async function baixarParaCache(
  cache: Cache,
  alvo: Alvo,
  onProgresso: (pct: number) => void
): Promise<void> {
  let ultimoErro: unknown = null;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    if (tentativa > 0) await esperar(1000 * Math.pow(3, tentativa - 1));
    try {
      const { response, renovar, finalizar } = await fetchComTimeout(alvo.url);
      if (!response.ok || !response.body) {
        finalizar();
        throw new Error(`HTTP ${response.status}`);
      }
      const totalHeader = Number(response.headers.get('Content-Length')) || alvo.bytes || 0;
      const reader = response.body.getReader();
      const chunks: BlobPart[] = [];
      let recebidos = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        renovar(); // chunk chegou: renova o prazo de 15s (detecção de stall)
        chunks.push(value);
        recebidos += value.byteLength;
        if (totalHeader > 0) onProgresso(Math.min(99, Math.round((recebidos / totalHeader) * 100)));
      }
      finalizar();
      const tipo = response.headers.get('Content-Type') ?? 'application/octet-stream';
      const blob = new Blob(chunks, { type: tipo });
      await cache.put(
        alvo.url,
        new Response(blob, {
          status: 200,
          headers: { 'Content-Type': tipo, 'Content-Length': String(blob.size) },
        })
      );
      onProgresso(100);
      return;
    } catch (err) {
      ultimoErro = err;
    }
  }
  throw ultimoErro instanceof Error ? ultimoErro : new Error(String(ultimoErro));
}

/**
 * Garante todos os arquivos de `manifest` no cache `conteudo-v{versao}`.
 * Reaproveita do cache anterior arquivos de hash idêntico (ou URL idêntica).
 * Se QUALQUER item falhar de vez: apaga o cache parcial e lança erro
 * (a versão ATIVA permanece intacta).
 */
export async function baixarVersao(manifest: Manifest, anterior: Manifest | null): Promise<void> {
  const nomeNovo = nomeCacheConteudo(manifest.versao);
  const cacheNovo = await caches.open(nomeNovo);
  const alvos = listarAlvos(manifest);

  // Índices do manifest anterior para reaproveitamento
  const hashParaUrl = new Map<string, string>();
  const urlsAntigas = new Set<string>();
  if (anterior) {
    for (const a of listarAlvos(anterior)) {
      urlsAntigas.add(a.url);
      if (a.hash) hashParaUrl.set(a.hash, a.url);
    }
  }
  const cacheAnterior = anterior ? await caches.open(nomeCacheConteudo(anterior.versao)) : null;

  setEstado({
    download: {
      emAndamento: true,
      statusPorItem: Object.fromEntries(
        manifest.itens.map((i) => [i.id, { fase: 'pendente' } as StatusDownload])
      ),
      pctTotal: 0,
      versaoAlvo: manifest.versao,
    },
  });

  let concluidos = 0;
  try {
    for (const alvo of alvos) {
      // Já está no cache novo (retomada)?
      if (await cacheNovo.match(alvo.url)) {
        concluidos++;
        atualizarStatus(alvo.itemId, { fase: 'pronto' });
        atualizarPctTotal(concluidos, alvos.length);
        continue;
      }

      // Reaproveita do cache anterior: mesmo hash ou mesma URL
      let reaproveitado = false;
      if (cacheAnterior) {
        const urlAntiga =
          (alvo.hash && hashParaUrl.get(alvo.hash)) ||
          (urlsAntigas.has(alvo.url) ? alvo.url : null);
        if (urlAntiga) {
          const res = await cacheAnterior.match(urlAntiga);
          if (res) {
            await cacheNovo.put(alvo.url, res.clone());
            reaproveitado = true;
          }
        }
      }

      if (!reaproveitado) {
        atualizarStatus(alvo.itemId, { fase: 'baixando', pct: 0 });
        await baixarParaCache(cacheNovo, alvo, (pct) =>
          atualizarStatus(alvo.itemId, { fase: 'baixando', pct })
        );
      }
      concluidos++;
      atualizarStatus(alvo.itemId, { fase: 'pronto' });
      atualizarPctTotal(concluidos, alvos.length);
    }
    const dl = getEstado().download;
    setEstado({ download: { ...dl, emAndamento: false, pctTotal: 100 } });
  } catch (err) {
    // Regra crítica: falhou um item → aborta a versão INTEIRA
    await caches.delete(nomeNovo).catch(() => {});
    const msg = err instanceof Error ? err.message : String(err);
    void registrarErro(`download v${manifest.versao} abortado: ${msg}`);
    const dl = getEstado().download;
    setEstado({ download: { ...dl, emAndamento: false } });
    throw err;
  }
}

/**
 * Baixa um único item para o cache da versão ATIVA (usado quando o usuário
 * abre algo que ainda não está no cache mas há rede).
 */
export async function baixarItemAvulso(item: ManifestItem, versaoAtiva: number): Promise<void> {
  try {
    const cache = await caches.open(nomeCacheConteudo(versaoAtiva));
    if (await cache.match(item.url)) return;
    await baixarParaCache(
      cache,
      { url: item.url, hash: item.hash, bytes: item.bytes, itemId: item.id },
      () => {}
    );
  } catch (err) {
    void registrarErro(
      `download avulso falhou (${item.titulo}): ${err instanceof Error ? err.message : err}`
    );
  }
}

/** Mantém no máximo os caches das versões informadas; apaga o resto. */
export async function podarCaches(manterVersoes: number[]): Promise<void> {
  const manter = new Set(manterVersoes.map((v) => nomeCacheConteudo(v)));
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((k) => k.startsWith(CONTEUDO_PREFIX) && !manter.has(k))
      .map((k) => caches.delete(k))
  );
}

/** Verifica se uma URL está em algum cache de conteúdo. */
export async function estaNoCache(url: string): Promise<boolean> {
  const keys = await caches.keys();
  for (const k of keys.filter((k) => k.startsWith(CONTEUDO_PREFIX))) {
    const cache = await caches.open(k);
    if (await cache.match(url)) return true;
  }
  return false;
}

/** Busca a resposta de uma URL em qualquer cache de conteúdo. */
export async function lerDoCache(url: string): Promise<Response | null> {
  const keys = await caches.keys();
  const ordenadas = keys
    .filter((k) => k.startsWith(CONTEUDO_PREFIX))
    .sort((a, b) => {
      const na = parseInt(a.slice(CONTEUDO_PREFIX.length), 10) || 0;
      const nb = parseInt(b.slice(CONTEUDO_PREFIX.length), 10) || 0;
      return nb - na;
    });
  for (const k of ordenadas) {
    const cache = await caches.open(k);
    const res = await cache.match(url);
    if (res) return res;
  }
  return null;
}
