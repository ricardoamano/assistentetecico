import { useEffect, useState } from 'react';
import { useAppState, irPara } from '../lib/store';
import { obterDeviceId, estimarEspaco } from '../lib/dispositivo';
import { verificarAtualizacao, limparERebaixar } from '../lib/manifest';
import { listarAlvos, estaNoCache } from '../lib/downloader';
import { DEVICES_URL, SUPABASE_ANON_KEY } from '../config';

interface LinhaArquivo {
  titulo: string;
  url: string;
  cacheado: boolean;
}

/** Menu local de manutenção (acessível por toque longo + PIN). */
export default function TelaAdmin() {
  const { ativo, staged, download } = useAppState();
  const [deviceId, setDeviceId] = useState('…');
  const [apelido, setApelido] = useState('—');
  const [espaco, setEspaco] = useState<{ usadoMb: number; livreMb: number } | null>(null);
  const [arquivos, setArquivos] = useState<LinhaArquivo[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void obterDeviceId().then((id) => {
      setDeviceId(id);
      // Apelido é definido no painel admin; busca best-effort (falha → "—")
      void fetch(`${DEVICES_URL}?device_id=eq.${id}&select=apelido`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((rows: Array<{ apelido?: string }> | null) => {
          if (rows && rows[0]?.apelido) setApelido(rows[0].apelido);
        })
        .catch(() => {});
    });
    void estimarEspaco().then(setEspaco);
  }, []);

  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    void (async () => {
      const linhas: LinhaArquivo[] = [];
      for (const alvo of listarAlvos(ativo)) {
        linhas.push({
          titulo: ativo.itens.find((i) => i.id === alvo.itemId)?.titulo ?? '(arte/fundo)',
          url: alvo.url,
          cacheado: await estaNoCache(alvo.url),
        });
      }
      if (vivo) setArquivos(linhas);
    })();
    return () => {
      vivo = false;
    };
  }, [ativo, download.emAndamento]);

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col bg-fundo-base px-6 pt-8"
      style={{ bottom: '12%' }}
    >
      <h1 className="mb-4 text-3xl font-bold text-branco">Manutenção</h1>

      <div className="mb-4 rounded-card bg-verde-escuro p-4 text-base text-branco/90">
        <p className="break-all">
          <span className="font-semibold">Dispositivo:</span> {deviceId}
        </p>
        <p>
          <span className="font-semibold">Apelido:</span> {apelido}
        </p>
        <p>
          <span className="font-semibold">Versão ATIVA:</span> {ativo ? `v${ativo.versao}` : '—'}
          {'   '}
          <span className="font-semibold">STAGED:</span> {staged ? `v${staged.versao}` : '—'}
        </p>
        <p>
          <span className="font-semibold">Espaço:</span>{' '}
          {espaco ? `${espaco.usadoMb} MB usados / ${espaco.livreMb} MB livres` : '—'}
        </p>
      </div>

      <p className="mb-2 text-lg font-semibold text-branco">Arquivos ({arquivos.length})</p>
      <div className="mb-4 flex-1 overflow-y-auto">
        {arquivos.map((a) => (
          <div
            key={a.url}
            className="mb-1 flex items-center justify-between rounded bg-verde-escuro/60 px-3 py-2"
          >
            <span className="mr-3 truncate text-sm text-branco/85">{a.titulo}</span>
            <span className="shrink-0 text-sm">{a.cacheado ? '✅' : '⬜'}</span>
          </div>
        ))}
        {!ativo && <p className="text-branco/60">Nenhuma versão ativa ainda.</p>}
      </div>

      {msg && <p className="mb-2 text-base text-lima">{msg}</p>}
      {download.emAndamento && (
        <p className="mb-2 text-base text-branco/80">Baixando… {download.pctTotal}%</p>
      )}

      <div className="flex flex-col gap-3 pb-4">
        <button
          onClick={() => {
            setMsg('Verificando atualização…');
            void verificarAtualizacao().then(() => setMsg('Verificação concluída.'));
          }}
          className="card-toque min-h-[64px] rounded-card bg-verde px-4 text-lg font-bold text-branco"
        >
          Verificar atualização
        </button>
        <button
          onClick={() => irPara({ nome: 'preparar' })}
          className="card-toque min-h-[64px] rounded-card bg-verde px-4 text-lg font-bold text-branco"
        >
          Preparar para o evento
        </button>
        <button
          onClick={() => {
            setMsg('Limpando cache e rebaixando tudo…');
            void limparERebaixar()
              .then(() => setMsg('Conteúdo rebaixado com sucesso.'))
              .catch((e) =>
                setMsg(`Falha ao rebaixar: ${e instanceof Error ? e.message : e}`)
              );
          }}
          disabled={download.emAndamento}
          className="card-toque min-h-[64px] rounded-card bg-red-800 px-4 text-lg font-bold text-branco disabled:opacity-40"
        >
          Limpar cache e rebaixar tudo
        </button>
      </div>
    </div>
  );
}
