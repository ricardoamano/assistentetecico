// NESTOR ops — destrava o bridge remotamente, com ações fixas (sem comandos livres).
// Roda na VPS via PM2, escuta só em 127.0.0.1 e fica atrás do nginx em https://nestor.neostore.app/ops/
// Rotas (todas exigem o cabeçalho "x-ops-token"):
//   GET  /status   → processos PM2, claude rodando, disco, memória, últimos erros do portal
//   POST /destravar → encerra "claude -p" presos e reinicia o processo do portal no PM2
const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');

const PORT = Number(process.env.OPS_PORT || 3099);
const TOKEN = process.env.NESTOR_OPS_TOKEN || '';
const PORTAL = process.env.PORTAL_PM2 || '';
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

async function destravar() {
  if (Date.now() - ultimaAcao < 60000) return { ok: false, motivo: 'aguarde 1 minuto entre destravamentos' };
  ultimaAcao = Date.now();
  const antes = await pm2Lista();
  const kill = await sh('pkill', ['-f', 'claude -p']);
  const rs = await sh('pm2', ['restart', PORTAL || 'all']);
  await new Promise((r) => setTimeout(r, 15000));
  return { ok: rs.ok, claude_encerrados: kill.ok, reinicio: (rs.out + rs.err).slice(-2000), antes, depois: await pm2Lista() };
}

http.createServer(async (req, res) => {
  const ip = req.headers['x-real-ip'] || req.socket.remoteAddress;
  const enviar = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj, null, 2)); };
  if (limitado(ip)) return enviar(429, { erro: 'muitas tentativas' });
  if (!autorizado(req)) return enviar(401, { erro: 'token inválido' });
  const rota = req.url.replace(/^\/ops/, '').split('?')[0];
  try {
    if (req.method === 'GET' && rota === '/status') return enviar(200, await status());
    if (req.method === 'POST' && rota === '/destravar') {
      console.log(new Date().toISOString(), 'destravar pedido por', ip);
      return enviar(200, await destravar());
    }
    enviar(404, { erro: 'rota inexistente', rotas: ['GET /ops/status', 'POST /ops/destravar'] });
  } catch (e) { enviar(500, { erro: String(e) }); }
}).listen(PORT, '127.0.0.1', () => console.log('nestor-ops em 127.0.0.1:' + PORT));
