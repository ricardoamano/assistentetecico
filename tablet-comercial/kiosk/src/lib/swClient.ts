import { getEstado } from './store';

let registro: ServiceWorkerRegistration | null = null;
let recarregouPorSW = false;

export function registrarServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  // Em dev o SW cachearia os assets do Vite e quebraria o HMR
  if (!import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        registro = reg;
      })
      .catch(() => {
        /* app segue funcionando sem SW (dev) */
      });

    // Quando um SW novo assumir, recarrega — mas o skipWaiting só é enviado
    // na home (ver ativarSWSeSeguro), então o reload nunca corta um item aberto.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (recarregouPorSW) return;
      recarregouPorSW = true;
      if (getEstado().tela.nome === 'home') location.reload();
    });
  });
}

/** Há um SW novo instalado aguardando ativação? */
export function haSWAguardando(): boolean {
  return !!registro?.waiting;
}

/**
 * Ativa o SW novo SOMENTE se o app estiver na home (nunca com item aberto).
 * Chamado ao voltar para a home e no fim do timeout de inatividade.
 */
export function ativarSWSeSeguro(): void {
  if (getEstado().tela.nome !== 'home') return;
  registro?.waiting?.postMessage({ type: 'SKIP_WAITING' });
}
