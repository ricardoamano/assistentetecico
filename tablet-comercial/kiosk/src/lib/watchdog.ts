import { idbGet, idbSet, K } from './idb';
import { WATCHDOG_INTERVALO_MS, WATCHDOG_LIMITE_MS, RECARGA_PREVENTIVA_MS } from '../config';
import { getEstado, irParaHome } from './store';

const inicioApp = Date.now();

/**
 * Watchdog: grava timestamp a cada 30s. Ao voltar de background, se o buraco
 * for maior que 5min (o WebView provavelmente congelou), recarrega na home.
 */
export function iniciarWatchdog(): void {
  const gravar = () => void idbSet(K.WATCHDOG_TS, Date.now()).catch(() => {});
  gravar();
  window.setInterval(gravar, WATCHDOG_INTERVALO_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    void (async () => {
      try {
        const ultimo = (await idbGet<number>(K.WATCHDOG_TS)) ?? Date.now();
        if (Date.now() - ultimo > WATCHDOG_LIMITE_MS) {
          irParaHome();
          location.reload();
        }
      } catch {
        /* silencioso */
      }
    })();
  });
}

/**
 * Recarga preventiva: app aberto há mais de 6h E ocioso na home →
 * location.reload() silencioso (o cache permanece, o usuário nem percebe).
 * `estaOcioso` vem do controlador de inatividade.
 */
export function iniciarRecargaPreventiva(estaOcioso: () => boolean): void {
  window.setInterval(() => {
    const { tela, videoTocando, download } = getEstado();
    if (
      Date.now() - inicioApp > RECARGA_PREVENTIVA_MS &&
      tela.nome === 'home' &&
      !videoTocando &&
      !download.emAndamento &&
      estaOcioso()
    ) {
      location.reload();
    }
  }, 60_000);
}
