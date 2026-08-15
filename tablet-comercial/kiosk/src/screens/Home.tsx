import { useRef } from 'react';
import type { ManifestItem, CorCard } from '../types';
import { useAppState, irPara } from '../lib/store';
import ImagemDoCache from '../components/ImagemDoCache';

const COR_BG: Record<CorCard, string> = {
  verde_escuro: '#05342E',
  verde: '#018063',
  lima: '#BCD62B',
  branco: '#F9FFFF',
};
const COR_TEXTO: Record<CorCard, string> = {
  verde_escuro: '#F9FFFF',
  verde: '#F9FFFF',
  lima: '#05342E',
  branco: '#05342E',
};

function abrirItem(item: ManifestItem): void {
  switch (item.tipo) {
    case 'pdf':
      irPara({ nome: 'pdf', item });
      break;
    case 'imagem':
      irPara({ nome: 'imagem', item });
      break;
    case 'video':
      irPara({ nome: 'video', item });
      break;
    case 'link':
      irPara({ nome: 'link', item });
      break;
  }
}

function Card({ item }: { item: ManifestItem }) {
  return (
    <button
      onClick={() => abrirItem(item)}
      className="card-toque relative flex flex-col items-center justify-center overflow-hidden px-3 py-2 text-center"
      style={{
        backgroundColor: COR_BG[item.cor_card] ?? COR_BG.verde,
        color: COR_TEXTO[item.cor_card] ?? COR_TEXTO.verde,
        borderRadius: 20,
        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        height: '11vh',
        minHeight: 88,
      }}
    >
      {item.requer_internet && (
        <span className="absolute right-2 top-2 rounded-full bg-black/30 px-2 py-0.5 text-[11px] font-semibold text-white">
          requer internet
        </span>
      )}
      {item.thumb && (
        <ImagemDoCache url={item.thumb} className="mb-1 h-[3.5vh] w-auto object-contain" />
      )}
      <span className="font-bold leading-tight" style={{ fontSize: 'max(22px, 1.9vh)' }}>
        {item.titulo}
      </span>
      {item.subtitulo && (
        <span className="mt-0.5 italic leading-tight opacity-90" style={{ fontSize: 15 }}>
          {item.subtitulo}
        </span>
      )}
    </button>
  );
}

/**
 * HOME. Layout por altura da tela (referência 1200×1920 retrato):
 * 0–34% livre para a arte; 34–88% grid de cards; 88–100% rodapé global.
 */
export default function Home() {
  const { ativo } = useAppState();
  const timerLongo = useRef<number | null>(null);

  // Toque longo de 5s no topo/logo → teclado de PIN do menu de manutenção
  const iniciarToqueLongo = () => {
    cancelarToqueLongo();
    timerLongo.current = window.setTimeout(() => irPara({ nome: 'pin' }), 5000);
  };
  const cancelarToqueLongo = () => {
    if (timerLongo.current !== null) {
      clearTimeout(timerLongo.current);
      timerLongo.current = null;
    }
  };

  const itens = [...(ativo?.itens ?? [])].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="absolute inset-0 z-10">
      {/* 0–34%: área livre para a arte (também é o alvo do toque longo) */}
      <div
        className="absolute left-0 right-0 top-0"
        style={{ height: '34%' }}
        onTouchStart={iniciarToqueLongo}
        onTouchEnd={cancelarToqueLongo}
        onTouchMove={cancelarToqueLongo}
        onPointerDown={iniciarToqueLongo}
        onPointerUp={cancelarToqueLongo}
        onPointerLeave={cancelarToqueLongo}
      />

      {/* 34–88%: grid de cards, 2 colunas; >6 itens → scroll vertical */}
      <div
        className="absolute left-0 right-0 overflow-y-auto"
        style={{ top: '34%', bottom: '12%', paddingLeft: '8%', paddingRight: '8%' }}
      >
        <div className="grid grid-cols-2" style={{ gap: '4vw', paddingBottom: '2vh' }}>
          {itens.map((item) => (
            <Card key={item.id} item={item} />
          ))}
        </div>
        {itens.length === 0 && (
          <p className="mt-8 text-center text-xl text-branco/80">
            Nenhum conteúdo publicado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
