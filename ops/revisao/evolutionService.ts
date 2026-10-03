// Envio de mensagens do agente pelo whatsapp-bridge (Evolution API foi desativada em 2026-10).
// Mesmo contrato de antes: sendText({ numero, mensagem, ... }) -> id da mensagem ou null.
import { prisma } from '../../lib/prisma';

const BRIDGE_API = process.env.BRIDGE_API || 'http://localhost:8080';

interface SendTextOptions {
  numero: string;
  mensagem: string;
  teamMemberId?: string;
  agendaEnvioId?: string;
  companyId: string;
}

export async function sendText(opts: SendTextOptions): Promise<string | null> {
  const numero = String(opts.numero).replace(/\D/g, '');
  let ok = false;
  try {
    const response = await fetch(`${BRIDGE_API}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: numero, message: opts.mensagem }),
      signal: AbortSignal.timeout(30000),
    });
    const data = (await response.json().catch(() => ({}))) as { success?: boolean; message?: string };
    ok = response.ok && data.success !== false;
    if (!ok) console.error(`[envio] Falha ao enviar para ${numero}: ${response.status} ${data.message ?? ''}`);
  } catch (e) {
    console.error(`[envio] Bridge indisponivel para ${numero}: ${(e as Error).message}`);
  }
  if (!ok) return null;

  await prisma.whatsappLog.create({
    data: {
      numero,
      direcao: 'ENVIADA',
      mensagem: opts.mensagem,
      messageId: null,
      teamMemberId: opts.teamMemberId ?? null,
      agendaEnvioId: opts.agendaEnvioId ?? null,
      companyId: opts.companyId,
    },
  });
  return 'bridge';
}
