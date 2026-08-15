// Copia o worker do pdfjs-dist para /public — self-hosted, sem CDN.
// Roda automaticamente antes de `npm run dev` e `npm run build` (pre-scripts).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const raiz = dirname(dirname(fileURLToPath(import.meta.url)));

const origem = join(
  dirname(require.resolve("pdfjs-dist/package.json")),
  "build",
  "pdf.worker.min.mjs"
);
const destinoDir = join(raiz, "public", "pdf-worker");
mkdirSync(destinoDir, { recursive: true });
copyFileSync(origem, join(destinoDir, "pdf.worker.min.mjs"));
console.log("pdf.worker.min.mjs copiado para public/pdf-worker/");
