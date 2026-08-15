import type { MenuItem } from "@/lib/types";

/** ✅ midia_ok limpo · ⚠️ ok com aviso · ⛔ bloqueado (não entra na publicação). */
export function SeloValidacao({ item }: { item: MenuItem }) {
  if (!item.midia_ok) {
    return (
      <span
        title={item.midia_aviso || "Item sem mídia válida — não entra na publicação."}
        className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
      >
        ⛔ Bloqueado
      </span>
    );
  }
  if (item.midia_aviso) {
    return (
      <span
        title={item.midia_aviso}
        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
      >
        ⚠️ Com aviso
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
      ✅ OK
    </span>
  );
}
