/** Formata bytes de forma humana (pt-BR). */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1).replace(".", ",")} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2).replace(".", ",")} GB`;
}

export function bytesToMB(bytes: number): number {
  return bytes / (1024 * 1024);
}

/** "há 3 min", "há 2 h", "há 5 dias" — ou "nunca". */
export function tempoRelativo(iso: string | null | undefined): string {
  if (!iso) return "nunca";
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "nunca";
  const diffMs = Date.now() - then;
  if (diffMs < 0) return "agora";
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "há 1 dia" : `há ${d} dias`;
}

/** Minutos desde um timestamp ISO; Infinity se nulo/inválido. */
export function minutosDesde(iso: string | null | undefined): number {
  if (!iso) return Infinity;
  const then = new Date(iso).getTime();
  if (isNaN(then)) return Infinity;
  return (Date.now() - then) / 60000;
}

export function formatDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
