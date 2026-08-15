import { useEffect, useRef, useState } from 'react';
import type { ManifestItem } from '../types';
import { estaNoCache, baixarItemAvulso } from '../lib/downloader';
import { getEstado, setEstado, useAppState } from '../lib/store';
import { TelaSemCache } from './ViewerPdf';

interface Props {
  item: ManifestItem;
}

/**
 * Viewer de vídeo. O <video> usa a URL NORMAL do arquivo — o Service Worker
 * intercepta e responde do Cache API com suporte a Range (206). O arquivo
 * NUNCA é carregado em memória aqui. Um único <video> na árvore por vez.
 */
export default function ViewerVideo({ item }: Props) {
  const { online } = useAppState();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pronto, setPronto] = useState<boolean | null>(null); // null = checando

  useEffect(() => {
    let vivo = true;
    void estaNoCache(item.url).then((tem) => {
      if (!vivo) return;
      if (tem || navigator.onLine) {
        setPronto(true);
        if (!tem) {
          // Sem cache mas com rede: toca da rede e dispara o download
          const versao = getEstado().ativo?.versao;
          if (versao) void baixarItemAvulso(item, versao);
        }
      } else {
        setPronto(false);
      }
    });
    return () => {
      vivo = false;
    };
  }, [item]);

  // Higiene obrigatória ao fechar: pause + removeAttribute('src') + load()
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      setEstado({ videoTocando: false });
    };
  }, [pronto]);

  if (pronto === null) return null;

  if (!pronto) {
    return (
      <TelaSemCache
        online={online}
        aoBaixar={() => {
          const versao = getEstado().ativo?.versao;
          if (versao) {
            setPronto(null);
            void baixarItemAvulso(item, versao).then(() =>
              estaNoCache(item.url).then((tem) => setPronto(tem || navigator.onLine))
            );
          }
        }}
      />
    );
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black" style={{ bottom: '12%' }}>
      <video
        ref={videoRef}
        src={item.url}
        playsInline
        preload="metadata"
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        className="max-h-full max-w-full"
        // O timer de inatividade pausa enquanto o vídeo estiver tocando
        onPlay={() => setEstado({ videoTocando: true })}
        onPause={() => setEstado({ videoTocando: false })}
        onEnded={() => setEstado({ videoTocando: false })}
      />
    </div>
  );
}
