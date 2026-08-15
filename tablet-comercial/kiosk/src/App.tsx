import { useAppState } from './lib/store';
import FundoHome from './components/FundoHome';
import Rodape from './components/Rodape';
import BannerUpdate from './components/BannerUpdate';
import OverlayInatividade from './components/OverlayInatividade';
import Home from './screens/Home';
import ViewerPdf from './screens/ViewerPdf';
import ViewerVideo from './screens/ViewerVideo';
import ViewerImagem from './screens/ViewerImagem';
import TelaLink from './screens/TelaLink';
import Preparar from './screens/Preparar';
import TelaPin from './screens/TelaPin';
import TelaAdmin from './screens/TelaAdmin';

export default function App() {
  const { tela } = useAppState();

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Fundo fixo, renderizado uma única vez */}
      <FundoHome />

      {tela.nome === 'home' && <Home />}
      {tela.nome === 'pdf' && <ViewerPdf item={tela.item} />}
      {tela.nome === 'video' && <ViewerVideo item={tela.item} />}
      {tela.nome === 'imagem' && <ViewerImagem item={tela.item} />}
      {tela.nome === 'link' && <TelaLink item={tela.item} />}
      {tela.nome === 'preparar' && <Preparar />}
      {tela.nome === 'pin' && <TelaPin />}
      {tela.nome === 'admin' && <TelaAdmin />}

      {tela.nome === 'ops' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-fundo-base">
          <p className="text-3xl font-bold text-branco">Ops, recarregando…</p>
        </div>
      )}

      <BannerUpdate />
      <OverlayInatividade />
      <Rodape />
    </div>
  );
}
