/*
 * Service Worker do Tablet Comercial (escrito à mão, sem workbox).
 *
 * Responsabilidades:
 *  1. Shell (HTML/JS/CSS/fontes/imagens do public/): cache runtime cache-first
 *     para GETs same-origin + fallback de navegação para o index.html cacheado.
 *     Isso dá o "precache" do shell sem manter lista de assets.
 *  2. Conteúdo (PDF/vídeo/imagem baixados pelo app nos caches `conteudo-v*`):
 *     responde do Cache API implementando HTTP Range (status 206) fatiando o
 *     blob — sem isso o <video> do Android não toca a partir do cache.
 *  3. skipWaiting controlado por mensagem — o app só manda quando está na home.
 *
 * __BUILD_ID__ é substituído no build (vite.config.ts). É o que faz o navegador
 * detectar um sw.js novo a cada deploy do shell.
 */

const BUILD_ID = '__BUILD_ID__';
const SHELL_CACHE = 'shell-' + BUILD_ID;
const CONTEUDO_PREFIX = 'conteudo-v';

self.addEventListener('install', (event) => {
  // Pré-cacheia só o index.html para garantir o fallback de navegação offline.
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.add('/index.html').catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Apaga shells antigos; os caches conteudo-v* são geridos pelo app.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('shell-') && k !== SHELL_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/** Procura uma URL em qualquer cache de conteúdo (conteudo-v*). */
async function matchConteudo(url) {
  const keys = await caches.keys();
  const conteudoKeys = keys.filter((k) => k.startsWith(CONTEUDO_PREFIX));
  // Versões mais novas primeiro (conteudo-v12 antes de conteudo-v9)
  conteudoKeys.sort((a, b) => {
    const na = parseInt(a.slice(CONTEUDO_PREFIX.length), 10) || 0;
    const nb = parseInt(b.slice(CONTEUDO_PREFIX.length), 10) || 0;
    return nb - na;
  });
  for (const key of conteudoKeys) {
    const cache = await caches.open(key);
    const res = await cache.match(url, { ignoreVary: true, ignoreSearch: false });
    if (res) return res;
  }
  return null;
}

/**
 * Constrói a resposta (200 ou 206) para um recurso cacheado.
 * Implementa Range requests fatiando o blob — obrigatório para <video>.
 */
async function respostaComRange(request, cachedResponse) {
  const rangeHeader = request.headers.get('range');
  const blob = await cachedResponse.blob();
  const contentType =
    cachedResponse.headers.get('Content-Type') || blob.type || 'application/octet-stream';

  if (!rangeHeader) {
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(blob.size),
        'Accept-Ranges': 'bytes',
      },
    });
  }

  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  let start = match && match[1] !== '' ? parseInt(match[1], 10) : NaN;
  let end = match && match[2] !== '' ? parseInt(match[2], 10) : NaN;

  if (isNaN(start) && !isNaN(end)) {
    // Sufixo: bytes=-500 → últimos 500 bytes
    start = Math.max(0, blob.size - end);
    end = blob.size - 1;
  } else {
    if (isNaN(start)) start = 0;
    if (isNaN(end) || end >= blob.size) end = blob.size - 1;
  }

  if (start >= blob.size || start > end) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': 'bytes */' + blob.size },
    });
  }

  const slice = blob.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(slice.size),
      'Content-Range': 'bytes ' + start + '-' + end + '/' + blob.size,
      'Accept-Ranges': 'bytes',
    },
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  event.respondWith(
    (async () => {
      // 1) Conteúdo baixado (qualquer origem): serve do cache com suporte a Range.
      const conteudo = await matchConteudo(request.url);
      if (conteudo) {
        return respostaComRange(request, conteudo);
      }

      // 2) Cross-origin não cacheado (manifest, storage ainda não baixado):
      //    passa direto pra rede, sem cachear aqui — quem baixa conteúdo é o app.
      if (!sameOrigin) {
        return fetch(request);
      }

      // 3) Shell same-origin: cache-first com preenchimento em runtime.
      const shell = await caches.open(SHELL_CACHE);
      const isNavigation = request.mode === 'navigate';
      const shellKey = isNavigation ? '/index.html' : request;

      const cached = await shell.match(shellKey);
      if (cached) return cached;

      try {
        const network = await fetch(request);
        if (network.ok && (network.type === 'basic' || network.type === 'default')) {
          shell.put(shellKey, network.clone()).catch(() => {});
        }
        return network;
      } catch (err) {
        // Sem rede: fallback de navegação para o index.html cacheado.
        if (isNavigation) {
          const fallback = await shell.match('/index.html');
          if (fallback) return fallback;
        }
        throw err;
      }
    })()
  );
});
