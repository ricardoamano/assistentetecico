"use client";

import { useRef, useState } from "react";
import { getSupabase, publicUrl } from "@/lib/supabase";
import { sha256Hex, extensaoDe } from "@/lib/hash";
import { uploadComProgresso } from "@/lib/upload";
import { validarImagem, validarPdf, validarVideo, type ResultadoValidacao } from "@/lib/validacao";
import { formatBytes } from "@/lib/format";
import type { CorCard, MenuItem, ModoAbertura, TipoItem } from "@/lib/types";
import { CorCardSelect } from "./CorCardSelect";

const ACEITA: Record<Exclude<TipoItem, "link">, string> = {
  pdf: ".pdf,application/pdf",
  video: ".mp4,video/mp4",
  imagem: "image/png,image/jpeg,image/webp",
};

interface Props {
  item: MenuItem | null; // null = novo item
  proximaOrdem: number;
  onFechar: () => void;
  onSalvo: () => void;
}

interface EstadoArquivo {
  storage_path: string | null;
  arquivo_hash: string | null;
  arquivo_bytes: number | null;
  arquivo_mime: string | null;
  thumb_path: string | null;
  midia_ok: boolean;
  midia_aviso: string | null;
}

export function ItemEditor({ item, proximaOrdem, onFechar, onSalvo }: Props) {
  const [titulo, setTitulo] = useState(item?.titulo ?? "");
  const [subtitulo, setSubtitulo] = useState(item?.subtitulo ?? "");
  const [tipo, setTipo] = useState<TipoItem>(item?.tipo ?? "pdf");
  const [corCard, setCorCard] = useState<CorCard>(item?.cor_card ?? "verde_escuro");
  const [ativo, setAtivo] = useState(item?.ativo ?? true);
  const [origemUrl, setOrigemUrl] = useState(item?.origem_url ?? "");
  const [urlExterna, setUrlExterna] = useState(item?.url_externa ?? "");
  const [modoAbertura, setModoAbertura] = useState<ModoAbertura>(item?.modo_abertura ?? "navegar");
  const [fallbackPath, setFallbackPath] = useState<string | null>(item?.fallback_path ?? null);

  const [arquivo, setArquivo] = useState<EstadoArquivo>({
    storage_path: item?.storage_path ?? null,
    arquivo_hash: item?.arquivo_hash ?? null,
    arquivo_bytes: item?.arquivo_bytes ?? null,
    arquivo_mime: item?.arquivo_mime ?? null,
    thumb_path: item?.thumb_path ?? null,
    midia_ok: item?.midia_ok ?? false,
    midia_aviso: item?.midia_aviso ?? null,
  });

  const [fase, setFase] = useState<"parado" | "validando" | "enviando" | "salvando">("parado");
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [bloqueio, setBloqueio] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);
  const inputFallback = useRef<HTMLInputElement>(null);

  const ocupado = fase !== "parado";

  // -----------------------------------------------------------
  // Upload principal (pdf / video / imagem): valida ANTES de subir
  // -----------------------------------------------------------
  async function trataArquivo(file: File) {
    setErro(null);
    setBloqueio(null);
    setFase("validando");
    setProgresso(0);
    try {
      const buffer = await file.arrayBuffer();

      let resultado: ResultadoValidacao;
      if (tipo === "video") resultado = await validarVideo(file, buffer);
      else if (tipo === "pdf") resultado = await validarPdf(file, buffer);
      else resultado = await validarImagem(file);

      if (resultado.status === "bloqueado") {
        setBloqueio(resultado.motivoBloqueio || "Arquivo reprovado na validação.");
        setFase("parado");
        return;
      }

      // sha256 no navegador → nome do arquivo no bucket
      const hash = await sha256Hex(buffer);
      const ext = tipo === "video" ? "mp4" : tipo === "pdf" ? "pdf" : extensaoDe(file.name);
      const path = `${hash}.${ext}`;
      const mime =
        file.type || (tipo === "pdf" ? "application/pdf" : tipo === "video" ? "video/mp4" : "image/png");

      setFase("enviando");
      await uploadComProgresso(path, file, mime, setProgresso);

      let thumbPath: string | null = null;
      if (resultado.thumbBlob) {
        thumbPath = `thumb-${hash}.png`;
        await uploadComProgresso(thumbPath, resultado.thumbBlob, "image/png");
      }

      setArquivo({
        storage_path: path,
        arquivo_hash: hash,
        arquivo_bytes: file.size,
        arquivo_mime: mime,
        thumb_path: thumbPath,
        midia_ok: true,
        midia_aviso: resultado.avisos.length ? resultado.avisos.join(" · ") : null,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao processar o arquivo.");
    } finally {
      setFase("parado");
    }
  }

  // -----------------------------------------------------------
  // Fallback (PDF opcional para tipo link)
  // -----------------------------------------------------------
  async function trataFallback(file: File) {
    setErro(null);
    setFase("validando");
    try {
      const buffer = await file.arrayBuffer();
      const resultado = await validarPdf(file, buffer);
      if (resultado.status === "bloqueado") {
        setErro(`PDF de fallback recusado: ${resultado.motivoBloqueio}`);
        return;
      }
      const hash = await sha256Hex(buffer);
      const path = `${hash}.pdf`;
      setFase("enviando");
      setProgresso(0);
      await uploadComProgresso(path, file, "application/pdf", setProgresso);
      setFallbackPath(path);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upload do fallback.");
    } finally {
      setFase("parado");
    }
  }

  // -----------------------------------------------------------
  // Salvar
  // -----------------------------------------------------------
  async function salvar() {
    setErro(null);
    if (!titulo.trim()) {
      setErro("Informe o título do item.");
      return;
    }
    if (tipo === "link" && !urlExterna.trim()) {
      setErro("Informe a URL externa do link.");
      return;
    }

    const ehLink = tipo === "link";
    const registro = {
      titulo: titulo.trim(),
      subtitulo: subtitulo.trim() || null,
      tipo,
      cor_card: corCard,
      ativo,
      origem_url: origemUrl.trim() || null,
      url_externa: ehLink ? urlExterna.trim() : null,
      modo_abertura: ehLink ? modoAbertura : "navegar",
      fallback_path: ehLink ? fallbackPath : null,
      storage_path: ehLink ? null : arquivo.storage_path,
      arquivo_hash: ehLink ? null : arquivo.arquivo_hash,
      arquivo_bytes: ehLink ? null : arquivo.arquivo_bytes,
      arquivo_mime: ehLink ? null : arquivo.arquivo_mime,
      thumb_path: ehLink ? null : arquivo.thumb_path,
      // link: ok quando tem URL. arquivo: ok quando o upload validado aconteceu.
      midia_ok: ehLink ? !!urlExterna.trim() : arquivo.midia_ok,
      midia_aviso: ehLink ? null : arquivo.midia_aviso,
    };

    setFase("salvando");
    const supabase = getSupabase();
    const { error } = item
      ? await supabase.from("menu_items").update(registro).eq("id", item.id)
      : await supabase.from("menu_items").insert({ ...registro, ordem: proximaOrdem });
    setFase("parado");

    if (error) {
      setErro(`Não foi possível salvar: ${error.message}`);
      return;
    }
    onSalvo();
  }

  const thumbUrl = publicUrl(arquivo.thumb_path);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="card my-8 w-full max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{item ? "Editar item" : "Novo item"}</h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-700" aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Título *</label>
              <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div>
              <label className="label">Subtítulo</label>
              <input className="input" value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Tipo</label>
              <select
                className="input"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoItem)}
                disabled={!!item}
                title={item ? "O tipo não muda depois de criado — crie outro item." : undefined}
              >
                <option value="pdf">PDF</option>
                <option value="video">Vídeo</option>
                <option value="imagem">Imagem</option>
                <option value="link">Link externo</option>
              </select>
            </div>
            <div>
              <label className="label">Origem (referência interna, ex.: link do Drive)</label>
              <input
                className="input"
                value={origemUrl}
                onChange={(e) => setOrigemUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          <div>
            <label className="label">Cor do card</label>
            <CorCardSelect valor={corCard} onChange={setCorCard} />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            Item ativo (aparece no tablet após publicar)
          </label>

          {/* ------------------- tipo LINK ------------------- */}
          {tipo === "link" && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <label className="label">URL externa *</label>
                <input
                  className="input"
                  value={urlExterna}
                  onChange={(e) => setUrlExterna(e.target.value)}
                  placeholder="https://exemplo.com.br"
                />
              </div>
              <div>
                <label className="label">Modo de abertura</label>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={modoAbertura === "navegar"}
                      onChange={() => setModoAbertura("navegar")}
                    />
                    Navegar (abre a página)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={modoAbertura === "iframe"}
                      onChange={() => setModoAbertura("iframe")}
                    />
                    Iframe (embutido)
                  </label>
                </div>
              </div>
              <div>
                <label className="label">PDF de fallback (opcional — mostrado se o tablet estiver offline)</label>
                {fallbackPath ? (
                  <div className="flex items-center gap-3 text-sm">
                    <a
                      href={publicUrl(fallbackPath) ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#018063] underline"
                    >
                      Ver PDF enviado
                    </a>
                    <button
                      type="button"
                      className="text-red-600 underline"
                      onClick={() => setFallbackPath(null)}
                      disabled={ocupado}
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <input
                    ref={inputFallback}
                    type="file"
                    accept=".pdf,application/pdf"
                    disabled={ocupado}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void trataFallback(f);
                      e.target.value = "";
                    }}
                    className="text-sm"
                  />
                )}
              </div>
            </div>
          )}

          {/* -------------- tipo PDF / VÍDEO / IMAGEM -------------- */}
          {tipo !== "link" && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-4">
                {thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbUrl}
                    alt="Miniatura"
                    className="h-20 w-32 rounded border border-slate-200 bg-white object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-32 items-center justify-center rounded border border-dashed border-slate-300 text-xs text-slate-400">
                    sem mídia
                  </div>
                )}
                <div className="flex-1 text-sm">
                  {arquivo.storage_path ? (
                    <>
                      <p className="font-medium text-slate-800">
                        Arquivo atual: <span className="font-mono text-xs">{arquivo.storage_path}</span>
                      </p>
                      <p className="text-slate-500">{formatBytes(arquivo.arquivo_bytes)}</p>
                      {arquivo.midia_aviso && (
                        <p className="mt-1 text-amber-700">⚠️ {arquivo.midia_aviso}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-500">
                      Nenhum arquivo ainda. Envie um {tipo === "pdf" ? "PDF" : tipo === "video" ? "vídeo .mp4" : "arquivo de imagem"} —
                      a validação roda antes do upload.
                    </p>
                  )}
                </div>
              </div>

              <input
                ref={inputArquivo}
                type="file"
                accept={ACEITA[tipo as Exclude<TipoItem, "link">]}
                disabled={ocupado}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void trataArquivo(f);
                  e.target.value = "";
                }}
                className="text-sm"
              />

              {fase === "validando" && (
                <p className="text-sm text-slate-600">Validando a mídia no navegador…</p>
              )}
              {fase === "enviando" && (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-600">
                    <span>Enviando…</span>
                    <span>{progresso}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[#018063] transition-all"
                      style={{ width: `${progresso}%` }}
                    />
                  </div>
                </div>
              )}
              {bloqueio && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  ⛔ {bloqueio}
                </p>
              )}
            </div>
          )}

          {erro && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button className="btn-secondary" onClick={onFechar} disabled={ocupado}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={salvar} disabled={ocupado}>
              {fase === "salvando" ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
