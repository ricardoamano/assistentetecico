/* Service worker: guarda o jogo no tablet para funcionar sem internet.
   Ao publicar uma nova versão, aumente o número em VERSION.
   Estratégia: abre sempre do cache (rápido e à prova de Wi-Fi ruim) e atualiza em segundo plano quando há internet. */
const VERSION = 'coffee-match-v8';
const FILES = ['./', './index.html', './manifest.webmanifest', './fonts/GoogleSans-Variable.woff2', './img/cup-esp.webp', './img/cup-cap.webp', './img/cup-mac.webp', './img/cup-cum.webp', './img/cup-cpt.webp', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(e.request, {ignoreSearch: true});
    const update = fetch(e.request).then(r => { if (r && r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => null);
    if (cached) { e.waitUntil(update); return cached; }
    const net = await update;
    return net || (await cache.match('./index.html')) || Response.error();
  }));
});
