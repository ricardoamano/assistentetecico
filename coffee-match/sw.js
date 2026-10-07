/* Service worker: guarda o jogo no tablet para funcionar sem internet.
   Ao publicar uma nova versão, aumente o número em VERSION. */
const VERSION = 'coffee-match-v4';
const FILES = ['./', './index.html', './manifest.webmanifest', './fonts/GoogleSans-Variable.woff2', './img/cup-esp.webp', './img/cup-cap.webp', './img/cup-mac.webp', './img/cup-cum.webp', './img/cup-cpt.webp', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* Rede primeiro (pega atualização quando há internet); cache se estiver offline */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(m => m || caches.match('./index.html')))
  );
});
