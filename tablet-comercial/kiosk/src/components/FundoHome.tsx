import { memo, useEffect, useState } from 'react';
import { useAppState } from '../lib/store';
import { lerDoCache } from '../lib/downloader';

/**
 * Fundo de tela cheia da home, num elemento fixo renderizado UMA vez.
 * Prioridade: fundo_url do manifest (cache) → /fundo-menu-alelo-1200.png do
 * public/ → gradiente CSS com o nome do evento. O app nunca quebra sem arte.
 */
function FundoHome() {
  const { ativo } = useAppState();
  const fundoUrl = ativo?.config.fundo_url ?? null;
  const [imagem, setImagem] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    let objUrl: string | null = null;

    void (async () => {
      // 1) Arte publicada no manifest, se já estiver no cache
      if (fundoUrl) {
        const res = await lerDoCache(fundoUrl);
        if (res && vivo) {
          objUrl = URL.createObjectURL(await res.blob());
          setImagem(objUrl);
          return;
        }
      }
      // 2) Arte local do public/, se o arquivo existir no deploy
      const teste = new Image();
      teste.onload = () => {
        if (vivo) setImagem('/fundo-menu-alelo-1200.png');
      };
      teste.onerror = () => {
        if (vivo) setImagem(null); // 3) gradiente
      };
      teste.src = '/fundo-menu-alelo-1200.png';
    })();

    return () => {
      vivo = false;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [fundoUrl]);

  return (
    <div
      className="fixed inset-0 z-0"
      style={
        imagem
          ? {
              backgroundImage: `url("${imagem}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'top center',
            }
          : { background: 'linear-gradient(to bottom, #0B3134, #072525)' }
      }
    >
      {!imagem && (
        <h1 className="pt-[10vh] text-center text-4xl font-bold text-branco">
          {ativo?.config.nome_evento ?? ''}
        </h1>
      )}
    </div>
  );
}

export default memo(FundoHome);
