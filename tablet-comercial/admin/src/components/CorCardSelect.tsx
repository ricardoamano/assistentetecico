"use client";

import { CORES_CARD, type CorCard } from "@/lib/types";

/** Seletor da cor do card com preview das 4 cores da campanha. */
export function CorCardSelect({
  valor,
  onChange,
}: {
  valor: CorCard;
  onChange: (cor: CorCard) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(CORES_CARD) as CorCard[]).map((cor) => {
        const info = CORES_CARD[cor];
        const selecionada = valor === cor;
        return (
          <button
            key={cor}
            type="button"
            onClick={() => onChange(cor)}
            title={info.label}
            className={
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all " +
              (selecionada
                ? "border-[#018063] ring-2 ring-[#018063]/40"
                : "border-slate-300 hover:border-slate-400")
            }
          >
            <span
              className="inline-block h-5 w-8 rounded border border-slate-300"
              style={{ backgroundColor: info.hex }}
            />
            {info.label}
          </button>
        );
      })}
    </div>
  );
}
