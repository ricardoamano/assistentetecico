import { useEffect, useState } from 'react';
import type { ManifestItem } from '../types';
import { lerDoCache, baixarItemAvulso, estaNoCache } from '../lib/downloader';
import { getEstado, useAppState } from '../lib/store';
import { TelaSemCache } from './ViewerPdf';

interface Props {
  item: ManifestItem;
}

/** Viewer de imagem em tela cheia (cache primeiro; rede como plano B). */
export default function ViewerImagem({ item }: Props) {
  const { online } = useAppState();
  const [src, setSrc] = useState<string | null>(null);
  const [semCache, setSemCache] = useState(false);

  useEffect(() => {
    let vivo = true;
    let objUrl: string | null = null;
    void (async () => {
      const res = await lerDoCache(item.url);
      if (res) {
        objUrl = URL.createObjectURL(await res.blob());
        if (vivo) setSrc(objUrl);
      } else if (navigator.onLine) {
        if (vivo) setSrc(item.url);
        const versao = getEstado().ativo?.versao;
        if (versao) void baixarItemAvulso(item, versao);
      } else if (vivo) {
        setSemCache(true);
      }
    })();
    return () => {
      vivo = false;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [item]);

  if (semCache) {
    return (
      <TelaSemCache
        online={online}
        aoBaixar={() => {
          const versao = getEstado().ativo?.versao;
          if (versao) {
            void baixarItemAvulso(item, versao).then(() =>
              estaNoCache(item.url).then((tem) => {
                if (tem) {
                  setSemCache(false);
                  location.reload();
                }
              })
            );
          }
        }}
      />
    );
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black" style={{ bottom: '12%' }}>
      {src && <img src={src} className="max-h-full max-w-full" alt={item.titulo} draggable={false} />}
    </div>
  );
}
