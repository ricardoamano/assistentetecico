// Tipos do manifest servido pelo backend (Edge Function /manifest)

export type TipoItem = 'pdf' | 'video' | 'link' | 'imagem';
export type CorCard = 'verde_escuro' | 'verde' | 'lima' | 'branco';
export type ModoAbertura = 'navegar' | 'iframe';

export interface ManifestConfig {
  nome_evento: string;
  logo_url: string | null;
  fundo_url: string | null;
  idle_timeout_segundos: number;
  idle_aviso_segundos: number;
  poll_intervalo_minutos: number;
  texto_banner_update: string;
}

export interface ManifestItem {
  id: string;
  ordem: number;
  titulo: string;
  subtitulo: string | null;
  tipo: TipoItem;
  url: string;
  hash: string | null;
  bytes: number | null;
  mime: string | null;
  thumb: string | null;
  cor_card: CorCard;
  modo_abertura: ModoAbertura;
  fallback: string | null;
  requer_internet: boolean;
}

export interface Manifest {
  versao: number;
  publicado_em: string;
  config: ManifestConfig;
  itens: ManifestItem[];
}

// Estado de download por item (tela "Preparar para o evento")
export type StatusDownload =
  | { fase: 'pendente' }
  | { fase: 'baixando'; pct: number }
  | { fase: 'pronto' }
  | { fase: 'falhou'; motivo: string };

export interface HeartbeatPayload {
  device_id: string;
  versao_ativa: number | null;
  versao_baixada: number | null;
  bytes_baixados: number | null;
  online_em: string;
  bateria: number | null;
  memoria_mb: number | null;
  user_agent: string;
  ultimo_erro: string | null;
  erros_24h: number;
}
