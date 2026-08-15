import { useAppState, voltar, irParaHome, getEstado } from '../lib/store';
import { aplicarStaged, verificarAtualizacao } from '../lib/manifest';
import { ativarSWSeSeguro } from '../lib/swClient';

/**
 * Rodapé sempre visível (≥56px): Voltar, Início, versão e status online.
 * Tocar em INÍCIO: fecha o que estiver aberto, volta à home, verifica
 * atualização e aplica a STAGED (momento seguro por definição).
 */
export default function Rodape() {
  const { tela, ativo, online } = useAppState();

  const aoVoltar = () => {
    if (tela.nome === 'home') return; // na home não faz nada
    voltar();
  };

  const aoInicio = () => {
    irParaHome();
    // Já estamos na home: aplicar staged e ativar SW novo é seguro agora
    void aplicarStaged().then(() => {
      if (getEstado().tela.nome === 'home') ativarSWSeSeguro();
    });
    void verificarAtualizacao();
  };

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between bg-verde-escuro px-4"
      style={{ height: '12vh', minHeight: 56 }}
    >
      <div className="flex gap-3">
        <button
          onClick={aoVoltar}
          className="card-toque min-h-[56px] min-w-[130px] rounded-card bg-verde px-5 text-lg font-semibold text-branco"
        >
          ← Voltar
        </button>
        <button
          onClick={aoInicio}
          className="card-toque min-h-[56px] min-w-[130px] rounded-card bg-verde px-5 text-lg font-semibold text-branco"
        >
          ⌂ Início
        </button>
      </div>
      <div className="flex items-center gap-3 text-branco">
        <span className="text-base opacity-80">{ativo ? `v${ativo.versao}` : 'v—'}</span>
        <span
          aria-label={online ? 'online' : 'offline'}
          className={`inline-block h-4 w-4 rounded-full ${online ? 'bg-lima' : 'bg-red-500'}`}
        />
      </div>
    </footer>
  );
}
