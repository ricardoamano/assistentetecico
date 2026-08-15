"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { montaCandidato, calculaDiff, type Mudanca } from "@/lib/manifest";
import { formatBytes, formatDataHora } from "@/lib/format";
import type { AppConfig, ManifestSnapshot, MenuItem } from "@/lib/types";

const ROTULO_MUDANCA: Record<Mudanca["tipo"], { texto: string; classe: string }> = {
  adicionado: { texto: "Adicionado", classe: "bg-emerald-100 text-emerald-700" },
  removido: { texto: "Removido", classe: "bg-red-100 text-red-700" },
  alterado: { texto: "Alterado", classe: "bg-amber-100 text-amber-800" },
  reordenado: { texto: "Reordenado", classe: "bg-sky-100 text-sky-700" },
};

export default function PublicarPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [itens, setItens] = useState<MenuItem[]>([]);
  const [snapshotAtual, setSnapshotAtual] = useState<ManifestSnapshot | null>(null);
  const [snapshotAnterior, setSnapshotAnterior] = useState<ManifestSnapshot | null>(null);
  const [versaoAnterior, setVersaoAnterior] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);

  const carrega = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const supabase = getSupabase();

    const [cfgRes, itensRes] = await Promise.all([
      supabase.from("app_config").select("*").eq("id", 1).single(),
      supabase.from("menu_items").select("*").order("ordem", { ascending: true }),
    ]);

    if (cfgRes.error || itensRes.error) {
      setErro(
        `Não foi possível carregar os dados: ${cfgRes.error?.message ?? itensRes.error?.message}`
      );
      setCarregando(false);
      return;
    }

    const cfg = cfgRes.data as AppConfig;
    setConfig(cfg);
    setItens((itensRes.data as MenuItem[]) ?? []);

    // Snapshot da versão publicada
    const { data: pubAtual } = await supabase
      .from("publicacoes")
      .select("versao, snapshot")
      .eq("versao", cfg.versao_publicada)
      .maybeSingle();
    setSnapshotAtual((pubAtual?.snapshot as ManifestSnapshot) ?? null);

    // Última publicação ANTERIOR à publicada (para reverter)
    const { data: pubAnterior } = await supabase
      .from("publicacoes")
      .select("versao, snapshot")
      .lt("versao", cfg.versao_publicada)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSnapshotAnterior((pubAnterior?.snapshot as ManifestSnapshot) ?? null);
    setVersaoAnterior(pubAnterior?.versao ?? null);

    setCarregando(false);
  }, []);

  useEffect(() => {
    void carrega();
  }, [carrega]);

  const proximaVersao = (config?.versao_publicada ?? 0) + 1;

  const candidato = useMemo(
    () => (config ? montaCandidato(config, itens, proximaVersao) : null),
    [config, itens, proximaVersao]
  );

  const diff = useMemo(
    () => (candidato ? calculaDiff(candidato, snapshotAtual) : null),
    [candidato, snapshotAtual]
  );

  const itensBloqueados = itens.filter((i) => i.ativo && !i.midia_ok);
  const publicacaoBloqueada = itensBloqueados.length > 0;

  async function publicar() {
    if (!config || !candidato) return;
    setErro(null);
    setSucesso(null);
    setPublicando(true);

    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    const emailUsuario = userData.user?.email ?? "desconhecido";

    const snapshot: ManifestSnapshot = {
      ...candidato,
      versao: proximaVersao,
      publicado_em: new Date().toISOString(),
    };

    const { error: erroInsert } = await supabase.from("publicacoes").insert({
      versao: proximaVersao,
      publicado_por: emailUsuario,
      snapshot,
    });
    if (erroInsert) {
      setErro(`Falha ao gravar a publicação: ${erroInsert.message}`);
      setPublicando(false);
      return;
    }

    const { error: erroUpdate } = await supabase
      .from("app_config")
      .update({ versao_publicada: proximaVersao, publicado_em: snapshot.publicado_em })
      .eq("id", 1);
    if (erroUpdate) {
      setErro(
        `A publicação foi gravada, mas houve falha ao ativar a versão: ${erroUpdate.message}. Recarregue e tente de novo.`
      );
      setPublicando(false);
      return;
    }

    setSucesso(`Versão ${proximaVersao} publicada. Os tablets atualizam no próximo poll.`);
    setPublicando(false);
    void carrega();
  }

  async function reverter() {
    if (!config || !snapshotAnterior || versaoAnterior == null) return;
    if (
      !confirm(
        `Reverter para o conteúdo da versão ${versaoAnterior}? Será criada a versão ${proximaVersao} com aquele conteúdo (as versões só andam para frente).`
      )
    )
      return;

    setErro(null);
    setSucesso(null);
    setPublicando(true);

    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    const emailUsuario = userData.user?.email ?? "desconhecido";

    const snapshot: ManifestSnapshot = {
      ...snapshotAnterior,
      versao: proximaVersao,
      publicado_em: new Date().toISOString(),
    };

    const { error: erroInsert } = await supabase.from("publicacoes").insert({
      versao: proximaVersao,
      publicado_por: `${emailUsuario} (reversão para v${versaoAnterior})`,
      snapshot,
    });
    if (erroInsert) {
      setErro(`Falha ao gravar a reversão: ${erroInsert.message}`);
      setPublicando(false);
      return;
    }

    const { error: erroUpdate } = await supabase
      .from("app_config")
      .update({ versao_publicada: proximaVersao, publicado_em: snapshot.publicado_em })
      .eq("id", 1);
    if (erroUpdate) {
      setErro(`Falha ao ativar a versão revertida: ${erroUpdate.message}`);
      setPublicando(false);
      return;
    }

    setSucesso(
      `Versão ${proximaVersao} publicada com o conteúdo da versão ${versaoAnterior}.`
    );
    setPublicando(false);
    void carrega();
  }

  if (carregando) {
    return <p className="text-sm text-slate-500">Montando o manifest candidato…</p>;
  }
  if (!config || !candidato || !diff) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {erro ?? "Não foi possível montar a publicação."}
      </p>
    );
  }

  const semMudancas =
    diff.mudancas.length === 0 && snapshotAtual !== null;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-bold">Publicar</h1>
      <p className="mb-6 text-sm text-slate-500">
        Versão publicada: <strong>{config.versao_publicada}</strong> · publicada em{" "}
        {formatDataHora(config.publicado_em)}
      </p>

      {/* Resumo do diff */}
      <div className="card mb-4">
        <p className="text-base font-semibold text-slate-800">
          {diff.itensAlterados}{" "}
          {diff.itensAlterados === 1 ? "item alterado" : "itens alterados"} ·{" "}
          {diff.arquivosNovos}{" "}
          {diff.arquivosNovos === 1 ? "arquivo novo" : "arquivos novos"} ·{" "}
          {formatBytes(diff.bytesNovos)} a baixar por tablet
        </p>
        <p className="mt-1 text-sm text-slate-500">
          A nova versão terá {candidato.itens.length}{" "}
          {candidato.itens.length === 1 ? "item ativo" : "itens ativos"}.
        </p>

        {diff.mudancas.length > 0 ? (
          <ul className="mt-4 space-y-1.5">
            {diff.mudancas.map((m, idx) => {
              const rotulo = ROTULO_MUDANCA[m.tipo];
              return (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${rotulo.classe}`}
                  >
                    {rotulo.texto}
                  </span>
                  <span className="text-slate-700">{m.titulo}</span>
                  {m.detalhe && <span className="text-xs text-slate-400">({m.detalhe})</span>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-400">
            {snapshotAtual
              ? "Nenhuma mudança em relação à versão publicada."
              : "Primeira publicação — todo o conteúdo ativo será enviado."}
          </p>
        )}
      </div>

      {/* Bloqueio */}
      {publicacaoBloqueada && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">
            ⛔ Publicação bloqueada: {itensBloqueados.length}{" "}
            {itensBloqueados.length === 1 ? "item ativo está" : "itens ativos estão"} sem mídia
            válida.
          </p>
          <p className="mt-1">
            Corrija (enviando um arquivo válido) ou desative os itens abaixo para liberar a
            publicação:
          </p>
          <ul className="mt-2 list-inside list-disc">
            {itensBloqueados.map((i) => (
              <li key={i.id}>
                <strong>{i.titulo}</strong>
                {i.midia_aviso ? ` — ${i.midia_aviso}` : " — sem arquivo validado"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {sucesso}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="btn-primary"
          onClick={publicar}
          disabled={publicando || publicacaoBloqueada || semMudancas}
          title={
            publicacaoBloqueada
              ? "Há itens ativos sem mídia válida."
              : semMudancas
                ? "Nada mudou desde a última publicação."
                : undefined
          }
        >
          {publicando ? "Publicando…" : `Publicar versão ${proximaVersao}`}
        </button>

        <button
          className="btn-secondary"
          onClick={reverter}
          disabled={publicando || !snapshotAnterior}
          title={
            !snapshotAnterior
              ? "Não há versão anterior para reverter."
              : `Cria a versão ${proximaVersao} com o conteúdo da versão ${versaoAnterior}.`
          }
        >
          Reverter para a versão anterior
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        As versões só andam para frente: reverter cria a versão {proximaVersao} com o snapshot da
        versão {versaoAnterior ?? "anterior"}. Os tablets atualizam quando a versão aumenta.
      </p>
    </div>
  );
}
