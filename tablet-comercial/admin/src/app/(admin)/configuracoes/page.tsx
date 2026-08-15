"use client";

import { useEffect, useState } from "react";
import { getSupabase, publicUrl } from "@/lib/supabase";
import { sha256Hex, extensaoDe } from "@/lib/hash";
import { uploadComProgresso } from "@/lib/upload";
import { validarImagem } from "@/lib/validacao";
import type { AppConfig } from "@/lib/types";

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState<"logo" | "fundo" | null>(null);

  useEffect(() => {
    getSupabase()
      .from("app_config")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data, error }) => {
        if (error) setErro(`Não foi possível carregar as configurações: ${error.message}`);
        else setConfig(data as AppConfig);
      });
  }, []);

  function altera<K extends keyof AppConfig>(campo: K, valor: AppConfig[K]) {
    setConfig((c) => (c ? { ...c, [campo]: valor } : c));
  }

  async function enviaImagem(campo: "logo" | "fundo", file: File) {
    setErro(null);
    setEnviando(campo);
    try {
      const resultado = await validarImagem(file);
      if (resultado.status === "bloqueado") {
        setErro(resultado.motivoBloqueio || "Imagem inválida.");
        return;
      }
      const buffer = await file.arrayBuffer();
      const hash = await sha256Hex(buffer);
      const path = `${hash}.${extensaoDe(file.name)}`;
      await uploadComProgresso(path, file, file.type || "image/png");
      const url = publicUrl(path);
      if (campo === "logo") altera("logo_url", url);
      else altera("fundo_url", url);
      setAviso("Imagem enviada. Clique em Salvar para gravar a configuração.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upload da imagem.");
    } finally {
      setEnviando(null);
    }
  }

  async function salvar() {
    if (!config) return;
    setErro(null);
    setAviso(null);

    if (config.idle_timeout_segundos < 0 || config.idle_aviso_segundos < 0) {
      setErro("Os tempos não podem ser negativos.");
      return;
    }
    if (config.poll_intervalo_minutos < 1) {
      setErro("O intervalo de verificação precisa ser de pelo menos 1 minuto.");
      return;
    }
    if (!/^\d{4,8}$/.test(config.pin_admin_local)) {
      setErro("O PIN do admin local deve ter de 4 a 8 dígitos numéricos.");
      return;
    }

    setSalvando(true);
    const { error } = await getSupabase()
      .from("app_config")
      .update({
        nome_evento: config.nome_evento,
        logo_url: config.logo_url,
        fundo_url: config.fundo_url,
        idle_timeout_segundos: config.idle_timeout_segundos,
        idle_aviso_segundos: config.idle_aviso_segundos,
        poll_intervalo_minutos: config.poll_intervalo_minutos,
        pin_admin_local: config.pin_admin_local,
        texto_banner_update: config.texto_banner_update,
      })
      .eq("id", 1);
    setSalvando(false);
    if (error) {
      setErro(`Não foi possível salvar: ${error.message}`);
      return;
    }
    setAviso("Configurações salvas. Elas valem para os tablets na PRÓXIMA publicação.");
  }

  if (!config) {
    return (
      <p className="text-sm text-slate-500">{erro ?? "Carregando configurações…"}</p>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">Configurações</h1>
      <p className="mb-6 text-sm text-slate-500">
        As mudanças só chegam aos tablets depois de <strong>publicar</strong> uma nova versão.
      </p>

      <div className="card space-y-5">
        <div>
          <label className="label">Nome do evento</label>
          <input
            className="input"
            value={config.nome_evento}
            onChange={(e) => altera("nome_evento", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Logo</label>
            {config.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.logo_url}
                alt="Logo atual"
                className="mb-2 h-16 rounded border border-slate-200 bg-slate-100 object-contain p-1"
              />
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="text-sm"
              disabled={enviando !== null}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void enviaImagem("logo", f);
                e.target.value = "";
              }}
            />
            {enviando === "logo" && <p className="mt-1 text-xs text-slate-500">Enviando…</p>}
          </div>
          <div>
            <label className="label">Imagem de fundo</label>
            {config.fundo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.fundo_url}
                alt="Fundo atual"
                className="mb-2 h-16 w-28 rounded border border-slate-200 object-cover"
              />
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="text-sm"
              disabled={enviando !== null}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void enviaImagem("fundo", f);
                e.target.value = "";
              }}
            />
            {enviando === "fundo" && <p className="mt-1 text-xs text-slate-500">Enviando…</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Timeout de inatividade (s)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={config.idle_timeout_segundos}
              onChange={(e) => altera("idle_timeout_segundos", Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-slate-400">0 = desligado</p>
          </div>
          <div>
            <label className="label">Aviso antes de voltar (s)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={config.idle_aviso_segundos}
              onChange={(e) => altera("idle_aviso_segundos", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Verificar novidades (min)</label>
            <input
              type="number"
              min={1}
              className="input"
              value={config.poll_intervalo_minutos}
              onChange={(e) => altera("poll_intervalo_minutos", Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">PIN do admin local (tablet)</label>
            <input
              className="input"
              inputMode="numeric"
              maxLength={8}
              value={config.pin_admin_local}
              onChange={(e) => altera("pin_admin_local", e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <label className="label">Texto do banner de atualização</label>
            <input
              className="input"
              value={config.texto_banner_update}
              onChange={(e) => altera("texto_banner_update", e.target.value)}
            />
          </div>
        </div>

        {erro && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}
        {aviso && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {aviso}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-400">
            Versão publicada: <strong>{config.versao_publicada}</strong>
          </p>
          <button className="btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
