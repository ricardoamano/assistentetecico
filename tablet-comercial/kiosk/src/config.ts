// Configuração central do app. Valores vêm do .env (Vite) com defaults seguros.

export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL || 'https://sbsjiiquxesyjtskjuyw.supabase.co';

// A anon key é pública por design (RLS limita ao heartbeat).
export const SUPABASE_ANON_KEY: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNic2ppaXF1eGVzeWp0c2tqdXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NjMxMDUsImV4cCI6MjEwMjMzOTEwNX0.n6cPyZBsuIh3vCWJTSbppFODJ8uXSBM-8XMklhgarA4';

export const MANIFEST_URL = `${SUPABASE_URL}/functions/v1/manifest`;
export const DEVICES_URL = `${SUPABASE_URL}/rest/v1/devices`;

// PIN local do menu de manutenção (não vem do manifest de propósito)
export const PIN_ADMIN: string = import.meta.env.VITE_PIN_ADMIN || '4321';

// Timeout padrão de qualquer fetch (ms)
export const FETCH_TIMEOUT_MS = 15_000;

// Intervalo do heartbeat (ms)
export const HEARTBEAT_INTERVALO_MS = 5 * 60_000;

// Watchdog: grava timestamp a cada 30s; >5min de buraco ao voltar → reload
export const WATCHDOG_INTERVALO_MS = 30_000;
export const WATCHDOG_LIMITE_MS = 5 * 60_000;

// Recarga preventiva: aberto há +6h e ocioso na home
export const RECARGA_PREVENTIVA_MS = 6 * 60 * 60_000;

// Nome do cache de conteúdo por versão do manifest
export const nomeCacheConteudo = (versao: number) => `conteudo-v${versao}`;
export const CONTEUDO_PREFIX = 'conteudo-v';
