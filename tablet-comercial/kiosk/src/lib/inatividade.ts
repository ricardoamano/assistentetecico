import { getEstado, setEstado, irParaHome } from './store';
import { aplicarStaged, verificarAtualizacao } from './manifest';
import { ativarSWSeSeguro } from './swClient';

/**
 * Controlador de inatividade.
 * - Sem toque por idle_timeout_segundos (0 = desligado) → overlay de aviso
 *   com contagem regressiva de idle_aviso_segundos e botão "Continuar aqui".
 * - Zerou → volta à home e aplica a versão STAGED (se houver).
 * - Qualquer toque reinicia o contador (inclusive dentro do PDF).
 * - PAUSA enquanto um vídeo estiver tocando (flag videoTocando no store).
 */

let ultimaAtividade = Date.now();
let timerAviso: number | null = null;

export function marcarAtividade(): void {
  ultimaAtividade = Date.now();
  // Toque durante o aviso: cancela o aviso e continua onde estava
  if (getEstado().avisoRestante !== null) cancelarAviso();
}

export function cancelarAviso(): void {
  if (timerAviso !== null) {
    clearInterval(timerAviso);
    timerAviso = null;
  }
  setEstado({ avisoRestante: null });
}

export function msDesdeUltimaAtividade(): number {
  return Date.now() - ultimaAtividade;
}

function estourou(): void {
  const { ativo, avisoRestante } = getEstado();
  if (avisoRestante !== null) return; // aviso já na tela
  const avisoSegundos = Math.max(1, ativo?.config.idle_aviso_segundos ?? 10);

  let restante = avisoSegundos;
  setEstado({ avisoRestante: restante });
  timerAviso = window.setInterval(() => {
    restante -= 1;
    if (restante <= 0) {
      cancelarAviso();
      voltarPorInatividade();
    } else {
      setEstado({ avisoRestante: restante });
    }
  }, 1000);
}

function voltarPorInatividade(): void {
  ultimaAtividade = Date.now();
  irParaHome();
  // Momento seguro para aplicar atualizações: ninguém está usando o tablet
  void aplicarStaged();
  ativarSWSeSeguro();
}

export function iniciarInatividade(): void {
  const eventos: (keyof DocumentEventMap)[] = ['touchstart', 'pointerdown', 'keydown', 'wheel'];
  for (const ev of eventos) {
    document.addEventListener(ev, marcarAtividade, { passive: true, capture: true });
  }

  window.setInterval(() => {
    const { ativo, videoTocando, tela, avisoRestante } = getEstado();
    const timeoutSegundos = ativo?.config.idle_timeout_segundos ?? 0;
    if (timeoutSegundos <= 0) return; // 0 = desligado
    if (videoTocando) {
      // Vídeo tocando conta como atividade (pausa a contagem)
      ultimaAtividade = Date.now();
      return;
    }
    if (tela.nome === 'home' && avisoRestante === null) {
      // Na home ociosa não precisa de aviso; só aproveita para aplicar staged
      if (msDesdeUltimaAtividade() > timeoutSegundos * 1000) {
        ultimaAtividade = Date.now();
        void aplicarStaged();
        ativarSWSeSeguro();
        void verificarAtualizacao();
      }
      return;
    }
    if (msDesdeUltimaAtividade() > timeoutSegundos * 1000) estourou();
  }, 1000);
}
