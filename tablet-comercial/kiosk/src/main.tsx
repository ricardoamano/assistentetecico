import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './index.css';
import App from './App';
import { registrarServiceWorker } from './lib/swClient';
import { instalarHandlersGlobais } from './lib/erros';
import { setEstado, irPara, getEstado } from './lib/store';
import {
  pedirStoragePersistente,
  travarRetrato,
  manterTelaAcordada,
} from './lib/dispositivo';
import { carregarManifestsLocais, verificarAtualizacao } from './lib/manifest';
import { iniciarHeartbeat } from './lib/heartbeat';
import { iniciarWatchdog, iniciarRecargaPreventiva } from './lib/watchdog';
import { iniciarInatividade, msDesdeUltimaAtividade } from './lib/inatividade';
import { idbGet, K } from './lib/idb';

// Kiosk: sem menu de contexto
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Erros globais → "Ops, recarregando…" + reload em 3s
instalarHandlersGlobais(() => setEstado({ tela: { nome: 'ops' } }));

// Ícone online/offline do rodapé
window.addEventListener('online', () => setEstado({ online: true }));
window.addEventListener('offline', () => setEstado({ online: false }));

// Verifica atualização ao voltar de background
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void verificarAtualizacao();
});

async function boot(): Promise<void> {
  registrarServiceWorker();
  travarRetrato();
  manterTelaAcordada();
  await pedirStoragePersistente();

  // O menu SEMPRE abre do cache primeiro: zero rede para renderizar a home
  await carregarManifestsLocais();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // 1ª abertura (nunca concluiu um download completo) → tela Preparar
  const primeiraOk = await idbGet<boolean>(K.PRIMEIRA_EXECUCAO_OK);
  if (!primeiraOk) irPara({ nome: 'preparar' });

  iniciarHeartbeat();
  iniciarWatchdog();
  iniciarInatividade();
  iniciarRecargaPreventiva(() => msDesdeUltimaAtividade() > 5 * 60_000);

  // Verificação em segundo plano (nunca bloqueia a home)
  void verificarAtualizacao();
  const agendarPoll = () => {
    // poll_intervalo_minutos pode mudar com o manifest; relê a cada disparo
    window.setTimeout(async () => {
      await verificarAtualizacao();
      agendarPoll();
    }, intervaloPollMs());
  };
  agendarPoll();
}

function intervaloPollMs(): number {
  const minutos = getEstado().ativo?.config.poll_intervalo_minutos ?? 10;
  return Math.max(1, minutos) * 60_000;
}

void boot();
