// NESTOR ops — destrava o bridge remotamente, com ações fixas (sem comandos livres).
// Roda na VPS via PM2, escuta só em 127.0.0.1 e fica atrás do nginx em https://nestor.neostore.app/ops/
// Rotas (todas exigem o cabeçalho "x-ops-token"):
//   GET  /status   → processos PM2, claude rodando, disco, memória, últimos erros do portal
//   POST /destravar[?app=nome] → encerra "claude -p" presos e reinicia o processo (padrão: PORTAL_PM2)
//   GET  /config     → processos PM2 com pasta, script e argumentos (sem variáveis de ambiente)
//   GET  /logs?app=nome&linhas=N → últimas linhas de log (saída e erro), com segredos mascarados
//   GET  /instrucoes → arquivos CLAUDE.md/AGENTS.md dos projetos, com segredos mascarados
//   GET  /codigo?app=nome → .tar.gz do código do processo (sem node_modules, .git, .env, sessões, chaves, mídias)
const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');

const PORT = Number(process.env.OPS_PORT || 3099);
const TOKEN = process.env.NESTOR_OPS_TOKEN || '';
const PORTAL = process.env.PORTAL_PM2 || '';
const fs = require('fs');
const path = require('path');

// Mascara segredos comuns antes de devolver texto
function mascarar(t) {
  return String(t)
    .replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, '$1***@')
    .replace(/\b(sk-[a-z0-9_-]{8})[a-z0-9_-]+/gi, '$1***')
    .replace(/\b(eyJ[a-z0-9_-]{10})[a-z0-9_.-]+/gi, '$1***')
    .replace(/((?:pass(?:word)?|senha|secret|token|api[_-]?key|chave)["']?\s*[:=]\s*["']?)[^\s"',;]{4,}/gi, '$1***');
}

async function processos() {
  const r = await sh('pm2', ['jlist']);
  try { return JSON.parse(r.out); } catch { return []; }
}
if (TOKEN.length < 32) { console.error('NESTOR_OPS_TOKEN ausente ou curto'); process.exit(1); }

let ultimaAcao = 0;
const tentativas = new Map(); // ip -> [timestamps]

function sh(cmd, args, timeout = 20000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, maxBuffer: 2 * 1024 * 1024 }, (err, stdout, stderr) =>
      resolve({ ok: !err, out: String(stdout || ''), err: String(stderr || (err && err.message) || '') }));
  });
}

function autorizado(req) {
  const t = Buffer.from(String(req.headers['x-ops-token'] || ''));
  const k = Buffer.from(TOKEN);
  return t.length === k.length && crypto.timingSafeEqual(t, k);
}

function limitado(ip) {
  const agora = Date.now();
  const lista = (tentativas.get(ip) || []).filter((x) => agora - x < 60000);
  lista.push(agora);
  tentativas.set(ip, lista);
  return lista.length > 20;
}

async function pm2Lista() {
  const r = await sh('pm2', ['jlist']);
  try {
    return JSON.parse(r.out).map((p) => ({
      nome: p.name, status: p.pm2_env.status, reinicios: p.pm2_env.restart_time,
      online_desde: new Date(p.pm2_env.pm_uptime).toISOString(),
      memoria_mb: Math.round((p.monit.memory || 0) / 1048576), cpu: p.monit.cpu,
    }));
  } catch { return [{ erro: r.err || 'pm2 jlist falhou' }]; }
}

async function status() {
  const [lista, ps, df, free] = await Promise.all([
    pm2Lista(),
    sh('ps', ['-eo', 'pid,etime,args']),
    sh('df', ['-h', '/']),
    sh('free', ['-m']),
  ]);
  const claude = ps.out.split('\n').filter((l) => /claude/i.test(l) && !/nestor-ops/.test(l)).map((l) => l.trim().slice(0, 200));
  let erros = '';
  if (PORTAL) erros = (await sh('pm2', ['logs', PORTAL, '--lines', '40', '--nostream', '--err'])).out.slice(-6000);
  return { portal_pm2: PORTAL || '(não definido: destravar reinicia todos)', pm2: lista, claude_rodando: claude,
           disco: df.out.trim().split('\n').pop(), memoria: free.out.trim().split('\n')[1], erros_portal: erros };
}

async function config() {
  return (await processos()).map((p) => ({
    nome: p.name, status: p.pm2_env.status, pasta: p.pm2_env.pm_cwd, script: p.pm2_env.pm_exec_path,
    args: p.pm2_env.args, interpretador: p.pm2_env.exec_interpreter, reinicios: p.pm2_env.restart_time,
    log_saida: p.pm2_env.pm_out_log_path, log_erro: p.pm2_env.pm_err_log_path,
  }));
}

async function appValido(nome) {
  return (await processos()).find((p) => p.name === nome);
}

async function logs(nome, linhas) {
  const p = await appValido(nome);
  if (!p) return { erro: 'app inexistente' };
  const n = String(Math.min(Math.max(Number(linhas) || 100, 10), 400));
  const [out, err] = await Promise.all([
    sh('tail', ['-n', n, p.pm2_env.pm_out_log_path]), sh('tail', ['-n', n, p.pm2_env.pm_err_log_path])]);
  return { app: nome, saida: mascarar(out.out), erro: mascarar(err.out) };
}

async function instrucoes() {
  const pastas = new Set(['/root', '/home/neostore', '/root/projects', '/root/projects/locadorafacil', '/opt/neostore']);
  for (const p of await processos()) if (p.pm2_env.pm_cwd) pastas.add(p.pm2_env.pm_cwd);
  const arquivos = new Set();
  for (const d of pastas) {
    for (const f of ['CLAUDE.md', 'AGENTS.md', '.claude/CLAUDE.md', '.claude/settings.json', '.claude/settings.local.json']) {
      const c = path.join(d, f); if (fs.existsSync(c)) arquivos.add(c);
    }
  }
  const r = await sh('find', ['/opt/neostore', '/root/projects', '-maxdepth', '3', '(', '-name', 'CLAUDE.md', '-o', '-name', 'AGENTS.md', ')', '-not', '-path', '*/node_modules/*']);
  r.out.split('\n').filter(Boolean).forEach((f) => arquivos.add(f));
  const res = {};
  for (const f of arquivos) { try { res[f] = mascarar(fs.readFileSync(f, 'utf8').slice(0, 60000)); } catch (e) { res[f] = 'erro: ' + e.message; } }
  return res;
}

const EXCLUIR = ['node_modules', '.git', '.next', 'dist', 'build', '.cache', '.wwebjs_auth', '.wwebjs_cache', 'auth_info*',
  'session*', 'sessions', 'baileys*', 'uploads', 'media', 'midia*', 'tmp', 'logs', 'segredos', 'backups'];
const EXCLUIR_ARQ = ['.env*', '*.pem', '*.key', '*.p12', '*.crt', '*.sqlite*', '*.db', '*.log', '*.zip', '*.tar*', '*.gz',
  '*.jpg', '*.jpeg', '*.png', '*.webp', '*.gif', '*.mp4', '*.mov', '*.mp3', '*.ogg', '*.pdf', '*credentials*', '*service-account*',
  '*secret*', '*passkey*', '*session*', 'sa.json', '*-sa.json', '*sa-key*', '*token*', '*vault*.json', 'master.key', '*.bak*', '*.quebrado*'];

function codigo(res, pasta) {
  const args = [pasta, '('];
  EXCLUIR.forEach((d, i) => { if (i) args.push('-o'); args.push('-name', d); });
  args.push(')', '-prune', '-o', '-type', 'f', '-size', '-1024k');
  EXCLUIR_ARQ.forEach((a) => args.push('!', '-name', a));
  args.push('-printf', '%P\n');
  execFile('find', args, { maxBuffer: 20 * 1024 * 1024 }, (err, lista) => {
    if (err && !lista) { res.writeHead(500); return res.end('falha ao listar'); }
    const arquivos = lista.split('\n').filter(Boolean).slice(0, 5000);
    res.writeHead(200, { 'content-type': 'application/gzip' });
    const tar = require('child_process').spawn('tar', ['czf', '-', '-C', pasta, '-T', '-']);
    tar.stdout.pipe(res);
    tar.stdin.end(arquivos.join('\n'));
  });
}

async function destravar(app) {
  if (Date.now() - ultimaAcao < 60000) return { ok: false, motivo: 'aguarde 1 minuto entre destravamentos' };
  ultimaAcao = Date.now();
  const antes = await pm2Lista();
  const kill = await sh('pkill', ['-f', 'claude -p']);
  const alvo = app && (await appValido(app)) ? app : (PORTAL || 'all');
  const rs = await sh('pm2', ['restart', alvo]);
  await new Promise((r) => setTimeout(r, 15000));
  return { ok: rs.ok, claude_encerrados: kill.ok, reinicio: (rs.out + rs.err).slice(-2000), antes, depois: await pm2Lista() };
}

http.createServer(async (req, res) => {
  const ip = req.headers['x-real-ip'] || req.socket.remoteAddress;
  const enviar = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj, null, 2)); };
  if (limitado(ip)) return enviar(429, { erro: 'muitas tentativas' });
  if (!autorizado(req)) return enviar(401, { erro: 'token inválido' });
  const url = new URL(req.url, 'http://x');
  const rota = url.pathname.replace(/^\/ops/, '');
  const q = url.searchParams;
  try {
    if (req.method === 'GET' && rota === '/status') return enviar(200, await status());
    if (req.method === 'POST' && rota === '/destravar') {
      console.log(new Date().toISOString(), 'destravar pedido por', ip);
      return enviar(200, await destravar(q.get('app')));
    }
    if (req.method === 'GET' && rota === '/config') return enviar(200, await config());
    if (req.method === 'GET' && rota === '/logs') return enviar(200, await logs(q.get('app'), q.get('linhas')));
    if (req.method === 'GET' && rota === '/instrucoes') return enviar(200, await instrucoes());
    if (req.method === 'GET' && rota === '/codigo') {
      const p = await appValido(q.get('app'));
      if (!p) return enviar(404, { erro: 'app inexistente' });
      console.log(new Date().toISOString(), 'codigo de', p.name, 'pedido por', ip);
      return codigo(res, p.pm2_env.pm_cwd);
    }
    enviar(404, { erro: 'rota inexistente', rotas: ['GET /ops/status', 'POST /ops/destravar[?app=]', 'GET /ops/config', 'GET /ops/logs?app=&linhas=', 'GET /ops/instrucoes', 'GET /ops/codigo?app='] });
  } catch (e) { enviar(500, { erro: String(e) }); }
}).listen(PORT, '127.0.0.1', () => console.log('nestor-ops em 127.0.0.1:' + PORT));
