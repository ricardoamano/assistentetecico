import { useAppState } from '../lib/store';
import { cancelarAviso, marcarAtividade } from '../lib/inatividade';

/** Overlay "Voltando ao início em N…" com botão "Continuar aqui". */
export default function OverlayInatividade() {
  const { avisoRestante } = useAppState();
  if (avisoRestante === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-verde-escuro/90">
      <p className="mb-8 px-8 text-center text-3xl font-bold text-branco">
        Voltando ao início em {avisoRestante}…
      </p>
      <button
        onClick={() => {
          marcarAtividade();
          cancelarAviso();
        }}
        className="card-toque min-h-[88px] rounded-card bg-lima px-10 text-2xl font-bold text-verde-escuro"
      >
        Continuar aqui
      </button>
    </div>
  );
}
