import { useEffect, useState } from 'react';
import { lerDoCache } from '../lib/downloader';

interface Props {
  url: string;
  className?: string;
  alt?: string;
}

/**
 * Renderiza uma imagem a partir do Cache API (objectURL revogado ao
 * desmontar — nenhum blob fica em estado do React, só a string da URL).
 */
export default function ImagemDoCache({ url, className, alt }: Props) {
  const [objUrl, setObjUrl] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    let criado: string | null = null;
    void (async () => {
      const res = await lerDoCache(url);
      if (!res || !ativo) return;
      const blob = await res.blob();
      if (!ativo) return;
      criado = URL.createObjectURL(blob);
      setObjUrl(criado);
    })();
    return () => {
      ativo = false;
      if (criado) URL.revokeObjectURL(criado);
    };
  }, [url]);

  if (!objUrl) return null;
  return <img src={objUrl} className={className} alt={alt ?? ''} draggable={false} />;
}
