import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ManifestItem } from '../types';
import { lerDoCache, baixarItemAvulso } from '../lib/downloader';
import { getEstado, useAppState } from '../lib/store';

// Worker do pdf.js empacotado pelo Vite — sem CDN
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface Props {
  item: ManifestItem;
}

/**
 * Viewer de PDF: UMA página renderizada por vez, swipe lateral troca página,
 * pinça para zoom (transform CSS), indicador "3/24".
 * Higiene de memória: canvas zerado + page.cleanup() ao trocar de página,
 * pdf.destroy() + revokeObjectURL ao sair.
 */
export default function ViewerPdf({ item }: Props) {
  const { online } = useAppState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const paginaAtualRef = useRef<PDFPageProxy | null>(null);
  const objUrlRef = useRef<string | null>(null);
  const renderizandoRef = useRef(false);

  const [totalPaginas, setTotalPaginas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Zoom/pan por transform CSS (permitido: só transform/opacity)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const pincaInicial = useRef<{ dist: number; zoom: number } | null>(null);
  const arrasto = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const swipeX = useRef<number | null>(null);

  // Carrega o documento (cache primeiro; rede como plano B)
  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);

    void (async () => {
      try {
        const res = await lerDoCache(item.url);
        let fonte: string;
        if (res) {
          const blob = await res.blob();
          objUrlRef.current = URL.createObjectURL(blob);
          fonte = objUrlRef.current;
        } else if (navigator.onLine) {
          // Sem cache mas com rede: abre da rede e dispara o download p/ cache
          fonte = item.url;
          const versao = getEstado().ativo?.versao;
          if (versao) void baixarItemAvulso(item, versao);
        } else {
          if (vivo) {
            setErro('offline');
            setCarregando(false);
          }
          return;
        }
        const doc = await pdfjs.getDocument({ url: fonte }).promise;
        if (!vivo) {
          void doc.destroy();
          return;
        }
        pdfRef.current = doc;
        setTotalPaginas(doc.numPages);
        setPagina(1);
        setCarregando(false);
      } catch (e) {
        if (vivo) {
          setErro(e instanceof Error ? e.message : 'Falha ao abrir o PDF');
          setCarregando(false);
        }
      }
    })();

    return () => {
      vivo = false;
      // Ordem importa: destruir o doc antes de revogar a URL do blob
      paginaAtualRef.current?.cleanup();
      paginaAtualRef.current = null;
      void pdfRef.current?.destroy();
      pdfRef.current = null;
      if (objUrlRef.current) {
        URL.revokeObjectURL(objUrlRef.current);
        objUrlRef.current = null;
      }
    };
  }, [item]);

  // Renderiza a página atual
  useEffect(() => {
    const doc = pdfRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || carregando || erro) return;

    let cancelado = false;
    void (async () => {
      if (renderizandoRef.current) return;
      renderizandoRef.current = true;
      try {
        // Limpa a página anterior antes de renderizar a nova
        if (paginaAtualRef.current) {
          paginaAtualRef.current.cleanup();
          paginaAtualRef.current = null;
        }
        const page = await doc.getPage(pagina);
        if (cancelado) {
          page.cleanup();
          return;
        }
        paginaAtualRef.current = page;

        const area = areaRef.current;
        const larguraDisp = area ? area.clientWidth : window.innerWidth;
        const viewport1 = page.getViewport({ scale: 1 });
        const escala = larguraDisp / viewport1.width;
        const dpr = Math.min(window.devicePixelRatio || 1, 2); // limitado a 2
        const viewport = page.getViewport({ scale: escala * dpr });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch {
        /* troca rápida de página pode cancelar renders: ignorar */
      } finally {
        renderizandoRef.current = false;
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [pagina, carregando, erro]);

  const trocarPagina = (delta: number) => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setPagina((p) => {
      const nova = p + delta;
      if (nova < 1 || nova > totalPaginas) return p;
      // Zera o canvas da página anterior (libera a memória do bitmap)
      const canvas = canvasRef.current;
      if (canvas && nova !== p) {
        canvas.width = 0;
        canvas.height = 0;
      }
      return nova;
    });
  };

  // ——— Gestos: pinça (zoom), arrasto (pan com zoom), swipe (troca página) ———
  const distancia = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const onPointerDown = (e: React.PointerEvent) => {
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...ponteiros.current.values()];
    if (pts.length === 2) {
      pincaInicial.current = { dist: distancia(pts[0], pts[1]), zoom };
      swipeX.current = null;
    } else if (pts.length === 1) {
      swipeX.current = e.clientX;
      if (zoom > 1) {
        arrasto.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!ponteiros.current.has(e.pointerId)) return;
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...ponteiros.current.values()];
    if (pts.length === 2 && pincaInicial.current) {
      const fator = distancia(pts[0], pts[1]) / pincaInicial.current.dist;
      setZoom(Math.min(4, Math.max(1, pincaInicial.current.zoom * fator)));
    } else if (pts.length === 1 && arrasto.current && zoom > 1) {
      setPan({
        x: arrasto.current.panX + (e.clientX - arrasto.current.x),
        y: arrasto.current.panY + (e.clientY - arrasto.current.y),
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const inicioX = swipeX.current;
    ponteiros.current.delete(e.pointerId);
    if (ponteiros.current.size < 2) pincaInicial.current = null;
    if (ponteiros.current.size === 0) {
      arrasto.current = null;
      // Swipe lateral só sem zoom (com zoom o gesto é pan)
      if (inicioX !== null && zoom <= 1.05) {
        const deltaX = e.clientX - inicioX;
        if (Math.abs(deltaX) > 60) trocarPagina(deltaX < 0 ? 1 : -1);
      }
      swipeX.current = null;
    }
  };

  if (erro === 'offline') {
    return (
      <TelaSemCache
        online={online}
        aoBaixar={() => {
          const versao = getEstado().ativo?.versao;
          if (versao) {
            setErro(null);
            setCarregando(true);
            void baixarItemAvulso(item, versao).then(() => location.reload());
          }
        }}
      />
    );
  }

  return (
    <div className="viewer-pdf absolute inset-0 z-10 flex flex-col bg-black" style={{ bottom: '12%' }}>
      {erro && (
        <p className="p-8 text-center text-xl text-branco">Não foi possível abrir: {erro}</p>
      )}
      {carregando && !erro && (
        <p className="p-8 text-center text-xl text-branco">Abrindo…</p>
      )}
      <div
        ref={areaRef}
        className="flex flex-1 items-start justify-center overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <canvas ref={canvasRef} />
        </div>
      </div>
      {totalPaginas > 0 && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1 text-lg font-semibold text-white">
          {pagina}/{totalPaginas}
        </div>
      )}
    </div>
  );
}

/** Tela de erro clara para conteúdo sem cache e sem rede. */
export function TelaSemCache({ online, aoBaixar }: { online: boolean; aoBaixar: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-fundo-base px-8" style={{ bottom: '12%' }}>
      <p className="mb-3 text-center text-2xl font-bold text-branco">
        Este conteúdo ainda não foi baixado
      </p>
      <p className="mb-8 text-center text-lg text-branco/80">
        {online
          ? 'Toque em "Baixar agora" para salvar no tablet.'
          : 'Conecte o tablet à internet e toque em "Baixar agora".'}
      </p>
      <button
        onClick={aoBaixar}
        className="card-toque min-h-[88px] rounded-card bg-lima px-10 text-2xl font-bold text-verde-escuro"
      >
        Baixar agora
      </button>
    </div>
  );
}
