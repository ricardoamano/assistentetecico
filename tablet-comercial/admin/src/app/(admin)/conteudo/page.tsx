"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getSupabase, publicUrl } from "@/lib/supabase";
import { formatBytes, bytesToMB } from "@/lib/format";
import { CORES_CARD, type MenuItem } from "@/lib/types";
import { SeloValidacao } from "@/components/SeloValidacao";
import { ItemEditor } from "@/components/ItemEditor";

const TIPO_LABEL: Record<MenuItem["tipo"], string> = {
  pdf: "PDF",
  video: "Vídeo",
  imagem: "Imagem",
  link: "Link",
};

function LinhaItem({
  item,
  onToggleAtivo,
  onEditar,
  onExcluir,
}: {
  item: MenuItem;
  onToggleAtivo: (item: MenuItem) => void;
  onEditar: (item: MenuItem) => void;
  onExcluir: (item: MenuItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const cor = CORES_CARD[item.cor_card] ?? CORES_CARD.verde_escuro;
  const thumb = publicUrl(item.thumb_path);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={
        "flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm " +
        (isDragging ? "z-10 opacity-80 ring-2 ring-[#018063]" : "")
      }
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        title="Arraste para reordenar"
        aria-label={`Reordenar ${item.titulo}`}
      >
        ⠿
      </button>

      <span className="w-6 text-center text-sm font-semibold text-slate-400">{item.ordem}</span>

      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          className="h-12 w-20 flex-shrink-0 rounded border border-slate-200 object-cover"
        />
      ) : (
        <div className="flex h-12 w-20 flex-shrink-0 items-center justify-center rounded border border-dashed border-slate-300 text-[10px] text-slate-400">
          {item.tipo === "link" ? "link" : "sem thumb"}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-slate-900">{item.titulo}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
            {TIPO_LABEL[item.tipo]}
          </span>
        </div>
        {item.subtitulo && <p className="truncate text-sm text-slate-500">{item.subtitulo}</p>}
        <div className="mt-1 flex items-center gap-2">
          <SeloValidacao item={item} />
          {item.arquivo_bytes != null && (
            <span className="text-xs text-slate-400">{formatBytes(item.arquivo_bytes)}</span>
          )}
        </div>
      </div>

      <span
        title={`Cor do card: ${cor.label}`}
        className="hidden h-8 w-12 flex-shrink-0 rounded border border-slate-300 sm:block"
        style={{ backgroundColor: cor.hex }}
      />

      <label
        className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600"
        title={item.ativo ? "Ativo — entra na publicação" : "Inativo — fora da publicação"}
      >
        <input
          type="checkbox"
          checked={item.ativo}
          onChange={() => onToggleAtivo(item)}
          className="h-4 w-4 accent-[#018063]"
        />
        {item.ativo ? "Ativo" : "Inativo"}
      </label>

      <div className="flex flex-shrink-0 gap-1">
        <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => onEditar(item)}>
          Editar
        </button>
        <button className="btn-danger !px-3 !py-1.5 text-xs" onClick={() => onExcluir(item)}>
          Excluir
        </button>
      </div>
    </li>
  );
}

export default function ConteudoPage() {
  const [itens, setItens] = useState<MenuItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editorAberto, setEditorAberto] = useState(false);
  const [itemEmEdicao, setItemEmEdicao] = useState<MenuItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const carrega = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from("menu_items")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) {
      setErro(`Não foi possível carregar os itens: ${error.message}`);
    } else {
      setErro(null);
      setItens((data as MenuItem[]) ?? []);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carrega();
  }, [carrega]);

  async function persisteOrdem(lista: MenuItem[]) {
    const supabase = getSupabase();
    const resultados = await Promise.all(
      lista.map((item, idx) =>
        item.ordem === idx + 1
          ? Promise.resolve({ error: null })
          : supabase.from("menu_items").update({ ordem: idx + 1 }).eq("id", item.id)
      )
    );
    const falha = resultados.find((r) => r.error);
    if (falha?.error) {
      setErro(`Falha ao salvar a nova ordem: ${falha.error.message}`);
      void carrega();
    }
  }

  function onDragEnd(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;
    setItens((atual) => {
      const de = atual.findIndex((i) => i.id === active.id);
      const para = atual.findIndex((i) => i.id === over.id);
      const nova = arrayMove(atual, de, para).map((i, idx) => ({ ...i, ordem: idx + 1 }));
      void persisteOrdem(nova);
      return nova;
    });
  }

  async function toggleAtivo(item: MenuItem) {
    setItens((atual) =>
      atual.map((i) => (i.id === item.id ? { ...i, ativo: !item.ativo } : i))
    );
    const { error } = await getSupabase()
      .from("menu_items")
      .update({ ativo: !item.ativo })
      .eq("id", item.id);
    if (error) {
      setErro(`Falha ao atualizar o item: ${error.message}`);
      void carrega();
    }
  }

  async function excluir(item: MenuItem) {
    if (!confirm(`Excluir o item "${item.titulo}"? Essa ação não tem volta.`)) return;
    const { error } = await getSupabase().from("menu_items").delete().eq("id", item.id);
    if (error) {
      setErro(`Falha ao excluir: ${error.message}`);
      return;
    }
    void carrega();
  }

  // Soma de armazenamento dos itens ativos
  const bytesAtivos = itens
    .filter((i) => i.ativo)
    .reduce((soma, i) => soma + (i.arquivo_bytes ?? 0), 0);
  const mbAtivos = bytesToMB(bytesAtivos);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Conteúdo</h1>
          <p className="text-sm text-slate-500">
            Arraste os cards para definir a ordem no tablet.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setItemEmEdicao(null);
            setEditorAberto(true);
          }}
        >
          + Novo item
        </button>
      </div>

      <div
        className={
          "mb-4 rounded-xl border px-4 py-3 text-sm " +
          (mbAtivos > 500
            ? "border-red-300 bg-red-50 text-red-800"
            : "border-slate-200 bg-white text-slate-600")
        }
      >
        <strong>{formatBytes(bytesAtivos)}</strong> de arquivos nos itens ativos.
        {mbAtivos > 500 && (
          <span className="ml-2 font-semibold">
            É muito conteúdo para baixar em Wi-Fi de evento — reduza os arquivos.
          </span>
        )}
      </div>

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-slate-500">Carregando itens…</p>
      ) : itens.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">
          Nenhum item ainda. Clique em <strong>+ Novo item</strong> para começar.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={itens.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {itens.map((item) => (
                <LinhaItem
                  key={item.id}
                  item={item}
                  onToggleAtivo={toggleAtivo}
                  onEditar={(i) => {
                    setItemEmEdicao(i);
                    setEditorAberto(true);
                  }}
                  onExcluir={excluir}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {editorAberto && (
        <ItemEditor
          item={itemEmEdicao}
          proximaOrdem={itens.length + 1}
          onFechar={() => setEditorAberto(false)}
          onSalvo={() => {
            setEditorAberto(false);
            void carrega();
          }}
        />
      )}
    </div>
  );
}
