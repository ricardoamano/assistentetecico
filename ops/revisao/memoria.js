#!/usr/bin/env node
// Base de conhecimento do NESTOR (schema nestor no banco do LocadoraFácil). Uso pelo Nestor via Bash.
//   node /opt/neostore-portal/bin/memoria.js buscar "pergunta" [--limite 5] [--categoria equipamento]
//   node /opt/neostore-portal/bin/memoria.js item "0019"            (ficha técnica de um item do cadastro, por código ou nome)
//   node /opt/neostore-portal/bin/memoria.js ver 30                 (item da base pelo #código)
//   node /opt/neostore-portal/bin/memoria.js guardar --titulo "..." --conteudo "..." [--categoria geral] [--tags a,b]
//        [--arquivo /caminho/ou/drive:ID] [--tipo texto|imagem|video|audio|documento] [--item 0019]
// Permissão vem do portal (NESTOR_DB_MODE): rw = pode guardar; ro / apoio = só consulta.
import pg from "/opt/neostore-portal/node_modules/pg/lib/index.js";

const MODE = process.env.NESTOR_DB_MODE || "ro";
const URL = { rw: process.env.NESTOR_DB_URL_RW, ro: process.env.NESTOR_DB_URL_RO, apoio: process.env.NESTOR_DB_URL_APOIO }[MODE]
  || process.env.NESTOR_DB_URL_APOIO || process.env.NESTOR_DB_URL_RO;
const COMPANY = "cmrinczr7000004jx57yua8rq";
const ADMIN = MODE === "rw" && process.env.NESTOR_AGENDA_PRIVATE === "1";
const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? (args[i + 1] ?? "") : d; };
const pos = args.slice(1).find((a, i, arr) => !a.startsWith("--") && !(i > 0 && arr[i - 1].startsWith("--")));

if (!URL) { console.error("Banco do NESTOR nao configurado (NESTOR_DB_URL_* ausente no .env do portal)."); process.exit(3); }
const db = new pg.Client({ connectionString: URL, ssl: { rejectUnauthorized: false }, statement_timeout: 20000 });

function corta(t, n = 1500) { t = String(t || ""); return t.length > n ? t.slice(0, n) + " […]" : t; }

try {
  await db.connect();
  if (cmd === "buscar") {
    if (!pos) throw new Error('informe a pergunta: buscar "texto"');
    const r = await db.query("SELECT codigo, titulo, categoria, tags, conteudo, dados, tipo, arquivo_path FROM nestor.buscar_memoria($1, NULL, $2, $3, $4)",
      [pos, ADMIN, opt("--categoria", null) || null, parseInt(opt("--limite", "5"), 10)]);
    if (!r.rows.length) console.log("(nada encontrado na base — diga que nao encontrou; nao invente)");
    for (const m of r.rows) {
      console.log(`\n## #${m.codigo} ${m.titulo}  [${m.categoria}${m.tipo !== "texto" ? " · " + m.tipo : ""}]`);
      if (m.tags?.length) console.log("tags: " + m.tags.join(", "));
      console.log(corta(m.conteudo));
      if (m.dados && Object.keys(m.dados).length) console.log("dados: " + corta(JSON.stringify(m.dados), 800));
      if (m.arquivo_path) console.log("arquivo: " + m.arquivo_path);
    }
  } else if (cmd === "ver") {
    const r = await db.query("SELECT codigo, titulo, categoria, tags, conteudo, dados, tipo, arquivo_path, criado_por, atualizado_em FROM nestor.memoria WHERE codigo = $1", [parseInt(pos, 10)]);
    if (!r.rows.length) console.log("(nao existe)"); else console.log(JSON.stringify(r.rows[0], null, 2));
  } else if (cmd === "item") {
    if (!pos) throw new Error('informe o codigo ou nome: item "0019"');
    const r = await db.query(`SELECT codigo, nome, modelo, apelidos, quantidade, especificacoes, watts, kva
      FROM "Item" WHERE "companyId" = $1 AND (codigo = $2 OR nome ILIKE '%' || $2 || '%' OR modelo ILIKE '%' || $2 || '%' OR apelidos ILIKE '%' || $2 || '%')
      ORDER BY (codigo = $2) DESC, codigo LIMIT 8`, [COMPANY, pos]);
    if (!r.rows.length) console.log("(nenhum item do cadastro com esse codigo/nome)");
    for (const i of r.rows) {
      console.log(`\n## Item ${i.codigo} — ${i.nome}${i.modelo ? " (" + i.modelo + ")" : ""}  qtd ${i.quantidade ?? "?"}`);
      if (i.apelidos) console.log("apelidos: " + i.apelidos);
      if (i.watts || i.kva) console.log(`consumo: ${i.watts ?? "?"} W / ${i.kva ?? "?"} kVA`);
      console.log(i.especificacoes ? corta(i.especificacoes) : "(sem especificacoes cadastradas)");
    }
    if (r.rows.length > 1) console.log("\nATENCAO: mais de um item corresponde — use o modelo/codigo certo e nunca misture dados de itens diferentes.");
  } else if (cmd === "guardar") {
    if (MODE !== "rw") { console.log("Este grupo e so de consulta: nao posso guardar informacoes aqui."); process.exit(4); }
    const titulo = opt("--titulo", ""), conteudo = opt("--conteudo", "");
    if (!titulo || !conteudo) throw new Error("--titulo e --conteudo sao obrigatorios");
    const arquivo = opt("--arquivo", null);
    const tipo = opt("--tipo", arquivo ? "documento" : "texto");
    const tags = String(opt("--tags", "")).split(",").map(s => s.trim()).filter(Boolean);
    const dados = {}; const item = opt("--item", null); if (item) dados.item_codigo = item;
    const r = await db.query(`INSERT INTO nestor.memoria (titulo, categoria, tags, conteudo, dados, tipo, arquivo_path, arquivo_nome, visibilidade, criado_por)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'equipe','whatsapp') RETURNING codigo`,
      [titulo, opt("--categoria", "geral"), tags, conteudo, dados, tipo, arquivo, arquivo ? String(arquivo).split("/").pop() : null]);
    console.log(`Guardado como #${r.rows[0].codigo}.`);
    if (item) {
      const u = await db.query(`UPDATE "Item" SET especificacoes = concat_ws(E'\\n\\n', NULLIF(especificacoes, ''), $3), "updatedAt" = now()
        WHERE "companyId" = $1 AND codigo = $2 RETURNING codigo`, [COMPANY, item, `[${new Date().toISOString().slice(0, 10)} via NESTOR #${r.rows[0].codigo}] ${conteudo}`]);
      console.log(u.rowCount ? `Acrescentado na ficha do item ${item}.` : `Item ${item} nao encontrado no cadastro (so ficou na base).`);
    }
  } else {
    console.log("comandos: buscar | item | ver | guardar  (ver cabecalho do arquivo)");
    process.exit(2);
  }
} catch (e) {
  console.error("Erro: " + e.message);
  process.exit(1);
} finally { await db.end().catch(() => {}); }
