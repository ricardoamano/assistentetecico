export type TipoItem = "pdf" | "video" | "link" | "imagem";
export type ModoAbertura = "navegar" | "iframe";
export type CorCard = "verde_escuro" | "verde" | "lima" | "branco";

export interface AppConfig {
  id: number;
  nome_evento: string;
  logo_url: string | null;
  fundo_url: string | null;
  idle_timeout_segundos: number;
  idle_aviso_segundos: number;
  poll_intervalo_minutos: number;
  pin_admin_local: string;
  texto_banner_update: string;
  versao_publicada: number;
  publicado_em: string;
}

export interface MenuItem {
  id: string;
  ordem: number;
  titulo: string;
  subtitulo: string | null;
  tipo: TipoItem;
  url_externa: string | null;
  modo_abertura: ModoAbertura;
  storage_path: string | null;
  arquivo_hash: string | null;
  arquivo_bytes: number | null;
  arquivo_mime: string | null;
  midia_ok: boolean;
  midia_aviso: string | null;
  origem_url: string | null;
  thumb_path: string | null;
  cor_card: CorCard;
  fallback_path: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Device {
  device_id: string;
  apelido: string | null;
  versao_ativa: number | null;
  versao_baixada: number | null;
  bytes_baixados: number | null;
  online_em: string | null;
  bateria: number | null;
  memoria_mb: number | null;
  user_agent: string | null;
  ultimo_erro: string | null;
  erros_24h: number | null;
}

export interface Publicacao {
  versao: number;
  publicado_por: string | null;
  snapshot: ManifestSnapshot;
  criado_em: string;
}

/** Formato EXATO do snapshot — contrato com os tablets. */
export interface ManifestSnapshot {
  versao: number;
  publicado_em: string;
  config: {
    nome_evento: string;
    logo_url: string | null;
    fundo_url: string | null;
    idle_timeout_segundos: number;
    idle_aviso_segundos: number;
    poll_intervalo_minutos: number;
    texto_banner_update: string;
  };
  itens: ManifestItem[];
}

export interface ManifestItem {
  id: string;
  ordem: number;
  titulo: string;
  subtitulo: string | null;
  tipo: TipoItem;
  url: string | null;
  hash: string | null;
  bytes: number | null;
  mime: string | null;
  thumb: string | null;
  cor_card: CorCard;
  modo_abertura: ModoAbertura;
  fallback: string | null;
  requer_internet: boolean;
}

export const CORES_CARD: Record<CorCard, { label: string; hex: string; texto: string }> = {
  verde_escuro: { label: "Verde escuro", hex: "#05342E", texto: "#F9FFFF" },
  verde: { label: "Verde", hex: "#018063", texto: "#F9FFFF" },
  lima: { label: "Lima", hex: "#BCD62B", texto: "#072525" },
  branco: { label: "Branco", hex: "#F9FFFF", texto: "#072525" },
};
