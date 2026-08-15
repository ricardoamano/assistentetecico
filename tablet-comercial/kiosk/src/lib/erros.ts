import { idbGet, idbSet, K } from './idb';

const JANELA_24H_MS = 24 * 60 * 60_000;

/** Registra um erro (ultimo_erro + janela deslizante de 24h). */
export async function registrarErro(mensagem: string): Promise<void> {
  try {
    const agora = Date.now();
    const msg = mensagem.slice(0, 500);
    await idbSet(K.ULTIMO_ERRO, `${new Date(agora).toISOString()} ${msg}`);
    const lista = (await idbGet<number[]>(K.ERROS_TIMESTAMPS)) ?? [];
    const recentes = lista.filter((t) => agora - t < JANELA_24H_MS);
    recentes.push(agora);
    await idbSet(K.ERROS_TIMESTAMPS, recentes);
  } catch {
    // registrar erro nunca pode derrubar o app
  }
}

export async function lerUltimoErro(): Promise<string | null> {
  try {
    return (await idbGet<string>(K.ULTIMO_ERRO)) ?? null;
  } catch {
    return null;
  }
}

export async function contarErros24h(): Promise<number> {
  try {
    const lista = (await idbGet<number[]>(K.ERROS_TIMESTAMPS)) ?? [];
    const agora = Date.now();
    return lista.filter((t) => agora - t < JANELA_24H_MS).length;
  } catch {
    return 0;
  }
}

/**
 * Handlers globais: qualquer erro não tratado grava no IndexedDB,
 * mostra "Ops, recarregando…" e recarrega em 3s.
 */
export function instalarHandlersGlobais(mostrarTelaOps: () => void): void {
  let recarregando = false;

  const tratar = (mensagem: string) => {
    void registrarErro(mensagem);
    if (recarregando) return;
    recarregando = true;
    mostrarTelaOps();
    window.setTimeout(() => location.reload(), 3000);
  };

  window.onerror = (msg, _src, _linha, _col, err) => {
    tratar(err?.message ?? String(msg));
    return false;
  };

  window.addEventListener('unhandledrejection', (ev) => {
    const razao = ev.reason instanceof Error ? ev.reason.message : String(ev.reason);
    tratar(`unhandledrejection: ${razao}`);
  });
}
