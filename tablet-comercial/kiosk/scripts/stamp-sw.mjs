// Pós-build: injeta um número de build no dist/sw.js.
// Sem isso o sw.js seria idêntico entre deploys e o navegador nunca
// detectaria um shell novo (o SW jamais atualizaria).
//
// A escrita é feita num arquivo temporário (verificado) e depois movida por
// cima do sw.js com rename atômico — robusto inclusive em filesystems com
// cache de leitura agressivo logo após o copyPublicDir do Vite.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const swPath = resolve(raiz, 'dist', 'sw.js');
const tmpPath = swPath + '.stamp-tmp';
const buildId = String(Date.now());

const src = readFileSync(swPath, 'utf-8');
if (!src.includes('__BUILD_ID__')) {
  console.error('[stamp-sw] placeholder __BUILD_ID__ não encontrado em dist/sw.js');
  process.exit(1);
}
// replaceAll: o placeholder aparece também no comentário do topo do sw.js
const novo = src.replaceAll('__BUILD_ID__', buildId);

if (!novo.includes(buildId) || novo.includes('__BUILD_ID__')) {
  console.error('[stamp-sw] FALHA: conteúdo carimbado não confere');
  process.exit(1);
}
writeFileSync(tmpPath, novo); // lança exceção em falha real de escrita
renameSync(tmpPath, swPath); // troca atômica
console.log(`[stamp-sw] dist/sw.js carimbado com BUILD_ID=${buildId}`);
