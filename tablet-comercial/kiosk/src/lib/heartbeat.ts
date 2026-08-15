import { DEVICES_URL, SUPABASE_ANON_KEY, HEARTBEAT_INTERVALO_MS } from '../config';
import type { HeartbeatPayload, Manifest } from '../types';
import { idbGet, K } from './idb';
import { contarErros24h, lerUltimoErro } from './erros';
import { obterBateria, obterDeviceId, obterMemoriaMb } from './dispositivo';

/**
 * Envia o heartbeat (upsert em /rest/v1/devices).
 * Falha de rede aqui é SEMPRE silenciosa — o tablet pode estar offline.
 */
export async function enviarHeartbeat(): Promise<void> {
  try {
    const [deviceId, ativo, staged, bateria, ultimoErro, erros24h] = await Promise.all([
      obterDeviceId(),
      idbGet<Manifest>(K.MANIFEST_ATIVO),
      idbGet<Manifest>(K.MANIFEST_STAGED),
      obterBateria(),
      lerUltimoErro(),
      contarErros24h(),
    ]);

    const bytesBaixados =
      (staged ?? ativo)?.itens.reduce((soma, item) => soma + (item.bytes ?? 0), 0) ?? null;

    const payload: HeartbeatPayload = {
      device_id: deviceId,
      versao_ativa: ativo?.versao ?? null,
      versao_baixada: staged?.versao ?? ativo?.versao ?? null,
      bytes_baixados: bytesBaixados,
      online_em: new Date().toISOString(),
      bateria,
      memoria_mb: obterMemoriaMb(),
      user_agent: navigator.userAgent.slice(0, 300),
      ultimo_erro: ultimoErro,
      erros_24h: erros24h,
    };

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15_000);
    await fetch(`${DEVICES_URL}?on_conflict=device_id`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });
    clearTimeout(timer);
  } catch {
    // silencioso por especificação
  }
}

let timerHeartbeat: number | null = null;

export function iniciarHeartbeat(): void {
  if (timerHeartbeat !== null) return;
  void enviarHeartbeat();
  timerHeartbeat = window.setInterval(() => void enviarHeartbeat(), HEARTBEAT_INTERVALO_MS);
}
