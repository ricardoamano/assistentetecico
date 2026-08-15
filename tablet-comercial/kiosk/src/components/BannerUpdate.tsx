import { useAppState, getEstado } from '../lib/store';
import { aplicarStaged } from '../lib/manifest';
import { ativarSWSeSeguro } from '../lib/swClient';

/**
 * Banner discreto no rodapé da home quando há versão STAGED pronta.
 * Só aparece na home — aplicar nunca acontece com item aberto.
 */
export default function BannerUpdate() {
  const { tela, staged, ativo } = useAppState();
  if (tela.nome !== 'home' || !staged) return null;

  const texto =
    staged.config.texto_banner_update ||
    ativo?.config.texto_banner_update ||
    'Nova versão de conteúdo disponível.';

  return (
    <div
      className="fixed left-0 right-0 z-30 flex items-center justify-between gap-3 bg-verde-escuro/95 px-5 py-3"
      style={{ bottom: '12vh' }}
    >
      <p className="text-base text-branco">{texto}</p>
      <button
        onClick={() => {
          void aplicarStaged().then(() => {
            if (getEstado().tela.nome === 'home') ativarSWSeSeguro();
          });
        }}
        className="card-toque min-h-[56px] shrink-0 rounded-card bg-lima px-6 text-lg font-bold text-verde-escuro"
      >
        Atualizar agora
      </button>
    </div>
  );
}
