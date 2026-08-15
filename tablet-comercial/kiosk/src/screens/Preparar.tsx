import { useCallback, useEffect, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { Manifest, ManifestItem, StatusDownload } from '../types';
import { useAppState, irParaHome } from '../lib/store';
import { buscarManifestRemoto, baixarTudoEAtivar } from '../lib/manifest';
import { estaNoCache, lerDoCache } from '../lib/downloader';
import { estimarEspaco } from '../lib/dispositivo';
import { idbSet, K } from '../lib/idb';

type Validacao = 'nao_feita' | 'validando' | 'ok' | 'falhou';

/**
 * Tela "Preparar para o evento": baixa e valida todo o conteúdo.
 * Exibida automaticamente na 1ª abertura e via menu de manutenção.
 */
export default function Preparar() {
  const { ativo, staged, download, online } = useAppState();
  const [remoto, setRemoto] = useState<Manifest | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [espaco, setEspaco] = useState<{ usadoMb: number; livreMb: number } | null>(null);
  const [cacheados, setCacheados] = useState<Record<string, boolean>>({});
  const [validacao, setValidacao] = useState<Validacao>('nao_feita');
  const [falhasTeste, setFalhasTeste] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const manifest = staged ?? remoto ?? ativo;

  // Busca manifest remoto quando não há nada local
  useEffect(() => {
    if (ativo || staged || remoto || buscando) return;
    setBuscando(true);
    void buscarManifestRemoto().then((m) => {
      setRemoto(m);
      setBuscando(false);
      if (!m) setErroGeral('Sem conexão. Conecte o tablet à internet e tente de novo.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, staged, remoto]);

  // Espaço livre + o que já está no cache
  useEffect(() => {
    void estimarEspaco().then(setEspaco);
    if (!manifest) return;
    let vivo = true;
    void (async () => {
      const mapa: Record<string, boolean> = {};
      for (const item of manifest.itens) {
        mapa[item.id] = item.tipo === 'link' ? true : await estaNoCache(item.url);
      }
      if (vivo) setCacheados(mapa);
    })();
    return () => {
      vivo = false;
    };
  }, [manifest, download.emAndamento]);

  /** Teste automático pós-download: vídeo mudo por 2s e PDF na página 1. */
  const validar = useCallback(async (m: Manifest): Promise<boolean> => {
    setValidacao('validando');
    const falhas: Record<string, string> = {};

    const video = m.itens.find((i) => i.tipo === 'video');
    if (video) {
      try {
        const res = await lerDoCache(video.url);
        if (!res) throw new Error('não está no cache');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        try {
          await new Promise<void>((resolve, reject) => {
            const el = document.createElement('video');
            el.muted = true;
            el.playsInline = true;
            el.src = url;
            const timer = setTimeout(() => {
              el.pause();
              el.removeAttribute('src');
              el.load();
              resolve(); // tocou 2s sem erro
            }, 2000);
            el.onerror = () => {
              clearTimeout(timer);
              reject(new Error('arquivo de vídeo não abre'));
            };
            void el.play().catch((e) => {
              clearTimeout(timer);
              reject(e instanceof Error ? e : new Error('vídeo não tocou'));
            });
          });
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch (e) {
        falhas[video.id] = `teste de vídeo: ${e instanceof Error ? e.message : e}`;
      }
    }

    const pdf = m.itens.find((i) => i.tipo === 'pdf');
    if (pdf) {
      try {
        const res = await lerDoCache(pdf.url);
        if (!res) throw new Error('não está no cache');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        try {
          const doc = await pdfjs.getDocument({ url }).promise;
          const page = await doc.getPage(1);
          page.cleanup();
          await doc.destroy();
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch (e) {
        falhas[pdf.id] = `teste de PDF: ${e instanceof Error ? e.message : e}`;
      }
    }

    setFalhasTeste(falhas);
    const ok = Object.keys(falhas).length === 0;
    setValidacao(ok ? 'ok' : 'falhou');
    return ok;
  }, []);

  const baixarTudo = useCallback(() => {
    setErroGeral(null);
    setFalhasTeste({});
    void (async () => {
      try {
        await baixarTudoEAtivar();
        const m = staged ?? remoto ?? ativo;
        if (m) await validar(m);
      } catch (e) {
        setErroGeral(
          `Falha no download: ${e instanceof Error ? e.message : e}. ` +
            'Nada foi perdido — toque em "Tentar de novo os que falharam".'
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, staged, remoto, validar]);

  const statusDe = (item: ManifestItem): StatusDownload => {
    if (falhasTeste[item.id]) return { fase: 'falhou', motivo: falhasTeste[item.id] };
    const doDownload = download.statusPorItem[item.id];
    if (doDownload && (download.emAndamento || doDownload.fase === 'falhou')) return doDownload;
    if (cacheados[item.id]) return { fase: 'pronto' };
    if (doDownload) return doDownload;
    return { fase: 'pendente' };
  };

  const itens = manifest?.itens ?? [];
  const totalMb = itens.reduce((s, i) => s + (i.bytes ?? 0), 0) / (1024 * 1024);
  const tudoPronto =
    itens.length > 0 &&
    itens.every((i) => statusDe(i).fase === 'pronto') &&
    validacao === 'ok';
  const algumaFalha = itens.some((i) => statusDe(i).fase === 'falhou');

  const concluir = () => {
    void idbSet(K.PRIMEIRA_EXECUCAO_OK, true);
    irParaHome();
  };

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col bg-fundo-base px-6 pt-8"
      style={{ bottom: '12%' }}
    >
      <h1 className="mb-1 text-3xl font-bold text-branco">Preparar para o evento</h1>
      <p className="mb-4 text-base text-branco/70">
        {manifest ? manifest.config.nome_evento : 'Buscando conteúdo…'}
        {manifest ? ` — v${manifest.versao}` : ''}
      </p>

      {erroGeral && (
        <p className="mb-3 rounded-card bg-red-900/60 px-4 py-3 text-base text-red-100">
          {erroGeral}
        </p>
      )}

      <div className="flex-1 overflow-y-auto">
        {itens.map((item) => {
          const st = statusDe(item);
          return (
            <div
              key={item.id}
              className="mb-2 flex items-center justify-between rounded-card bg-verde-escuro px-4 py-3"
            >
              <div className="min-w-0 pr-3">
                <p className="truncate text-lg font-semibold text-branco">{item.titulo}</p>
                <p className="text-sm text-branco/60">
                  {item.tipo}
                  {item.bytes ? ` — ${(item.bytes / (1024 * 1024)).toFixed(1)} MB` : ''}
                </p>
                {st.fase === 'falhou' && (
                  <p className="text-sm text-red-300">{st.motivo}</p>
                )}
              </div>
              <span className="shrink-0 text-xl text-branco">
                {st.fase === 'pendente' && '⬜'}
                {st.fase === 'baixando' && `🔄 ${st.pct}%`}
                {st.fase === 'pronto' && '✅'}
                {st.fase === 'falhou' && '❌'}
              </span>
            </div>
          );
        })}
        {itens.length === 0 && !buscando && !erroGeral && (
          <p className="text-lg text-branco/70">Nenhum item no manifest.</p>
        )}
      </div>

      <div className="border-t border-branco/10 py-3 text-base text-branco/80">
        <p>
          Total: {totalMb.toFixed(1)} MB
          {espaco ? ` — Espaço livre: ${espaco.livreMb} MB` : ''}
          {validacao === 'validando' ? ' — testando vídeo e PDF…' : ''}
          {validacao === 'ok' ? ' — teste de abertura OK ✅' : ''}
        </p>
        {download.emAndamento && (
          <p className="mt-1">Baixando… {download.pctTotal}%</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 pb-4">
        <button
          onClick={baixarTudo}
          disabled={download.emAndamento || !online || !manifest}
          className="card-toque min-h-[72px] flex-1 rounded-card bg-verde px-4 text-xl font-bold text-branco disabled:opacity-40"
        >
          Baixar tudo
        </button>
        {algumaFalha && (
          <button
            onClick={baixarTudo}
            disabled={download.emAndamento || !online}
            className="card-toque min-h-[72px] flex-1 rounded-card bg-verde px-4 text-xl font-bold text-branco disabled:opacity-40"
          >
            Tentar de novo os que falharam
          </button>
        )}
        <button
          onClick={concluir}
          disabled={!tudoPronto}
          className="card-toque min-h-[72px] flex-1 rounded-card bg-lima px-4 text-xl font-bold text-verde-escuro disabled:opacity-40"
        >
          Tudo pronto
        </button>
      </div>
    </div>
  );
}
