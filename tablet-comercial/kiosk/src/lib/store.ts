import { useSyncExternalStore } from 'react';
import type { Manifest, ManifestItem, StatusDownload } from '../types';

/** Telas do app (máquina de estados simples, sem router). */
export type Tela =
  | { nome: 'home' }
  | { nome: 'pdf'; item: ManifestItem }
  | { nome: 'video'; item: ManifestItem }
  | { nome: 'imagem'; item: ManifestItem }
  | { nome: 'link'; item: ManifestItem }
  | { nome: 'preparar' }
  | { nome: 'pin' }
  | { nome: 'admin' }
  | { nome: 'ops' }; // "Ops, recarregando…"

export interface EstadoDownload {
  emAndamento: boolean;
  statusPorItem: Record<string, StatusDownload>;
  pctTotal: number;
  versaoAlvo: number | null;
}

export interface AppState {
  ativo: Manifest | null;
  staged: Manifest | null;
  tela: Tela;
  pilha: Tela[]; // histórico para o botão Voltar
  online: boolean;
  videoTocando: boolean;
  download: EstadoDownload;
  /** Segundos restantes do aviso de inatividade (null = sem aviso na tela) */
  avisoRestante: number | null;
}

let estado: AppState = {
  ativo: null,
  staged: null,
  tela: { nome: 'home' },
  pilha: [],
  online: navigator.onLine,
  videoTocando: false,
  download: { emAndamento: false, statusPorItem: {}, pctTotal: 0, versaoAlvo: null },
  avisoRestante: null,
};

const ouvintes = new Set<() => void>();

export function getEstado(): AppState {
  return estado;
}

export function setEstado(parcial: Partial<AppState>): void {
  estado = { ...estado, ...parcial };
  ouvintes.forEach((fn) => fn());
}

export function irPara(tela: Tela): void {
  setEstado({ tela, pilha: [...estado.pilha, estado.tela] });
}

export function voltar(): void {
  const pilha = [...estado.pilha];
  const anterior = pilha.pop();
  if (anterior) {
    setEstado({ tela: anterior, pilha });
  }
}

export function irParaHome(): void {
  setEstado({ tela: { nome: 'home' }, pilha: [] });
}

function subscribe(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getEstado);
}
