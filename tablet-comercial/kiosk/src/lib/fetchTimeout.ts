import { FETCH_TIMEOUT_MS } from '../config';

/**
 * fetch com AbortController e timeout (padrão 15s).
 * O timeout cobre a espera pelos headers; para corpos grandes em stream,
 * o chamador renova o prazo a cada chunk via o retorno `renovar`.
 */
export interface FetchTimeoutResult {
  response: Response;
  renovar: () => void;
  finalizar: () => void;
}

export async function fetchComTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<FetchTimeoutResult> {
  const controller = new AbortController();
  let timer = window.setTimeout(() => controller.abort(), timeoutMs);

  const renovar = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => controller.abort(), timeoutMs);
  };
  const finalizar = () => clearTimeout(timer);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    renovar(); // headers chegaram; renova para leitura do corpo
    return { response, renovar, finalizar };
  } catch (err) {
    finalizar();
    throw err;
  }
}

/** Versão simples: resolve com a Response e encerra o timer (corpos pequenos). */
export async function fetchSimples(
  url: string,
  init?: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const { response, finalizar } = await fetchComTimeout(url, init, timeoutMs);
  finalizar();
  return response;
}
