/** SHA-256 (hex) calculado no navegador sobre o ArrayBuffer completo do arquivo. */
export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Extensão minúscula do nome do arquivo (sem ponto). */
export function extensaoDe(nome: string): string {
  const m = nome.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "bin";
}
