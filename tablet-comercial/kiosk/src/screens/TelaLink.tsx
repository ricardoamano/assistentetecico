import { useEffect, useRef, useState } from 'react';
import type { ManifestItem } from '../types';
import { useAppState, irPara } from '../lib/store';
import { registrarErro } from '../lib/erros';

interface Props {
  item: ManifestItem;
}

/**
 * Link externo.
 * - modo 'navegar' (padrão): window.location.href = url — o kiosk Android
 *   cuida do botão voltar.
 * - modo 'iframe': abre em iframe mantendo rodapé e timer de inatividade;
 *   se não carregar em 6s, cai automaticamente para 'navegar' e registra
 *   aviso no ultimo_erro (vai no próximo heartbeat).
 * - Sem conexão: tela de erro + "Tentar de novo" + "Ver versão em PDF"
 *   quando houver fallback.
 */
export default function TelaLink({ item }: Props) {
  const { online } = useAppState();
  const [tentativa, setTentativa] = useState(0);
  const carregouRef = useRef(false);
  const semRede = !online;

  const navegar = () => {
    window.location.href = item.url;
  };

  useEffect(() => {
    if (semRede) return;
    if (item.modo_abertura !== 'iframe') {
      navegar();
      return;
    }
    // Modo iframe: timeout de 6s sem evento load → fallback para 'navegar'
    carregouRef.current = false;
    const timer = window.setTimeout(() => {
      if (!carregouRef.current) {
        void registrarErro(`iframe não carregou em 6s: ${item.url} — caindo para navegar`);
        navegar();
      }
    }, 6000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, tentativa, semRede]);

  if (semRede) {
    return (
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-fundo-base px-8"
        style={{ bottom: '12%' }}
      >
        <p className="mb-8 text-center text-2xl font-bold text-branco">Sem conexão no momento</p>
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setTentativa((t) => t + 1)}
            className="card-toque min-h-[88px] rounded-card bg-lima px-10 text-2xl font-bold text-verde-escuro"
          >
            Tentar de novo
          </button>
          {item.fallback && (
            <button
              onClick={() =>
                irPara({
                  nome: 'pdf',
                  item: { ...item, tipo: 'pdf', url: item.fallback as string },
                })
              }
              className="card-toque min-h-[88px] rounded-card bg-verde px-10 text-2xl font-bold text-branco"
            >
              Ver versão em PDF
            </button>
          )}
        </div>
      </div>
    );
  }

  if (item.modo_abertura !== 'iframe') {
    return (
      <div
        className="absolute inset-0 z-10 flex items-center justify-center bg-fundo-base"
        style={{ bottom: '12%' }}
      >
        <p className="text-xl text-branco">Abrindo…</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-10 bg-white" style={{ bottom: '12%' }}>
      <iframe
        key={tentativa}
        src={item.url}
        title={item.titulo}
        className="h-full w-full border-0"
        onLoad={() => {
          carregouRef.current = true;
        }}
      />
    </div>
  );
}
