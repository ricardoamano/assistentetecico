# Neostore Link

Pad de texto estilo dontpad.com, só que fechado:

- Cada endereço `link.neostore.app/nome` pede um **PIN numérico** (4 a 8 dígitos).
- Depois do PIN, o texto fica na tela por **N segundos** (barra + cronômetro). Zerou, a tela volta para o PIN e o texto some.
- Quem abriu pode **editar** durante a janela (autosave). O admin pode deixar um link como somente leitura.
- O painel de **superadmin** fica em outro endereço (`/admin` por padrão, você pode trocar) com senha própria. Lá você cria links, define PIN, tempo e conteúdo, e ajusta o tempo padrão global.

## Arquivos

| Arquivo | O que é |
|---------|---------|
| `app.js` | O app inteiro (páginas, API, regras). Roda na Vercel e na Cloudflare. |
| `api/index.js` | Adaptador Vercel: recebe todas as rotas e entrega ao `app.js`. |
| `lib/supabase.js` | Storage padrão: tabela no Supabase (projeto `neostore-site`), acessada por função protegida por segredo. |
| `lib/upstash.js` | Storage alternativo: Upstash Redis (marketplace da Vercel). Usado só se as variáveis do Supabase não existirem. |
| `vercel.json` | Manda todas as URLs para a função. |
| `package.json` | Sem dependências. `npm test` roda os testes locais. |
| `wrangler.toml` | Só para quem preferir rodar na Cloudflare Workers (alternativa). |
| `test/run.mjs` | Testes: fluxo completo nas duas plataformas, sem serviços externos. |

---

## Instalação na Vercel com deploy automático

Depois disso, todo push no branch de produção publica sozinho.

### 1. Importar o repositório
1. https://vercel.com/new → **Import Git Repository** → escolha `ricardoamano/assistentetecico`.
   Se a Vercel ainda não vê o GitHub, clique em **Adjust GitHub App Permissions** e libere o repositório.
2. Na tela de configuração:
   - **Project Name**: `neostore-link`
   - **Framework Preset**: `Other`
   - **Root Directory**: clique em **Edit** e escolha `link` (importante: o app fica nessa pasta)
   - Build Command / Output Directory: deixe vazio
3. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |------|-------|
   | `ADMIN_PASSWORD` | senha do superadmin (longa, não é o PIN) |
   | `ADMIN_PATH` | caminho do painel, ex.: `painel-ns-2026` (sem barra) |
   | `BRAND_NAME` | `Neostore Link` (opcional) |
   | `SUPABASE_URL` | `https://cgaranykjfldeiruojct.supabase.co` (projeto `neostore-site`) |
   | `SUPABASE_ANON_KEY` | chave pública **anon** do projeto (Supabase → Settings → API) |
   | `LINK_DB_SECRET` | o segredo gravado na tabela `neostore_link_config` (Supabase → Table Editor) |

4. Clique em **Deploy**.

### 2. Banco
Já está pronto: a migração `supabase/migrations/003_neostore_link.sql` foi aplicada no projeto
Supabase `neostore-site`. Ela cria a tabela `neostore_link_kv`, a tabela `neostore_link_config`
(onde fica o segredo) e a função `neostore_link_kv_op`. As tabelas não têm policies, então
só a função acessa os dados, e a função exige o segredo. A Vercel usa apenas a chave pública.

Para trocar o segredo: gere um novo, atualize a linha em `neostore_link_config` e a variável
`LINK_DB_SECRET` na Vercel, e faça Redeploy.

Alternativa sem Supabase: **Storage → Create Database → Upstash Redis** na Vercel e remova as
três variáveis do Supabase. O app detecta `KV_REST_API_URL`/`KV_REST_API_TOKEN` sozinho.

### 3. Branch de produção
O código está no branch `claude/gifted-gates-buazjl`. Escolha um dos dois:

- **Simples**: no projeto, **Settings → Git → Production Branch** → digite `claude/gifted-gates-buazjl` → Save. A partir daí, cada push nesse branch publica em produção.
- **Organizado**: faça o merge desse branch no branch principal do repositório. A Vercel já usa o branch padrão como produção.

Qualquer outro branch gera um **preview** com URL própria, sem mexer na produção.

### 4. Domínio `link.neostore.app` (DNS na Cloudflare)
1. Na Vercel: **Settings → Domains → Add** → `link.neostore.app`. A Vercel mostra o registro esperado: `CNAME` → `cname.vercel-dns.com`.
2. Na Cloudflare: **neostore.app → DNS → Add record**:
   - Type: `CNAME`
   - Name: `link`
   - Target: `cname.vercel-dns.com`
   - **Proxy status: DNS only (nuvem cinza)**. Com a nuvem laranja a Vercel não consegue emitir o certificado.
3. Volte na Vercel e aguarde o domínio ficar **Valid Configuration** (1 a 10 minutos).

### 5. Testar
1. Abra `https://link.neostore.app/painel-ns-2026` (ou o caminho que definiu em `ADMIN_PATH`).
2. Entre com a senha do superadmin e ajuste o **tempo padrão**.
3. Crie um link: nome `teste`, PIN `2468`, conteúdo qualquer → **Salvar link**.
4. Abra `https://link.neostore.app/teste` no celular, digite o PIN, veja o cronômetro.

---

## Como usar no dia a dia

1. Superadmin entra no painel e cria `/nome-do-evento` com um PIN.
2. Manda o link e o PIN para a equipe (de preferência por canais diferentes).
3. A equipe abre, lê ou edita, e a tela fecha sozinha no tempo definido.
4. Terminou o evento: **Excluir** no painel.

**Regras de nome:** letras minúsculas, números e hífen, de 2 a 40 caracteres. `admin`, `api`, `static` são reservados.

---

## Limites e ajustes

| O que | Valor | Onde mudar |
|-------|-------|------------|
| Tempo de exposição | 5 s a 3600 s, padrão 60 s | painel (global ou por link); limites em `DEFAULTS` no `app.js` |
| PIN | 4 a 8 dígitos | `DEFAULTS.pinMin/pinMax` |
| Tentativas de PIN | 8 por IP a cada 10 min por link | `DEFAULTS.rateLimitMax/rateLimitWindow` |
| Sessão do superadmin | 12 horas | `DEFAULTS.adminSessionHours` |
| Tamanho do texto | 500 KB por link | `DEFAULTS.contentMaxBytes` |
| Cores | variáveis no topo de `BASE_CSS` | `app.js` |

Mudou algo? Commit + push no branch de produção. A Vercel publica em cerca de 1 minuto.

---

## O que é e o que não é seguro aqui

- O PIN é curto e numérico porque foi pedido simples. O limitador de tentativas dificulta chute automático, mas **não use para senha de banco, cartão ou dados de cliente**. É para informação operacional de evento (wifi, ramal, endereço, checklist).
- O PIN fica visível no painel de propósito, para você conseguir repassar à equipe.
- Quem tirar print durante a janela fica com o texto. O tempo limita exposição acidental, não vazamento intencional.
- O painel só é protegido pela senha do superadmin. Use senha longa e troque o `ADMIN_PATH` para algo não óbvio.
- Se trocar `ADMIN_PASSWORD`, todas as sessões do painel caem (é o esperado).
- Edição é "último que salva vence". Duas pessoas digitando ao mesmo tempo no mesmo link podem sobrescrever uma à outra.

## Custo

Vercel Hobby (gratuito) + tabela no Supabase que já existe: custo zero adicional.
Atenção: o plano Hobby da Vercel é para uso pessoal/não comercial pelos termos deles. Se a Neostore usar isso como ferramenta da empresa em volume, o correto é o plano Pro (US$ 20/mês por membro). A alternativa Cloudflare abaixo não tem essa restrição no plano gratuito.

---

## Alternativa: Cloudflare Workers (sem Vercel)

O mesmo `app.js` roda como Worker, sem mudar nada.

Pelo painel:
1. **Workers & Pages → Create → Create Worker** → nome `neostore-link` → Deploy → **Edit code** → cole o `app.js` inteiro → Deploy.
2. **Storage & Databases → KV → Create namespace** `neostore-link-pads`. No Worker: **Settings → Bindings → Add → KV namespace**, variável `PADS`.
3. **Settings → Variables and Secrets**: secret `ADMIN_PASSWORD`, texto `ADMIN_PATH` e `BRAND_NAME`.
4. **Settings → Domains & Routes → Add → Custom domain** → `link.neostore.app` (a Cloudflare cria o DNS sozinha).

Por linha de comando: `npx wrangler kv namespace create PADS` (cole o id no `wrangler.toml`), `npx wrangler secret put ADMIN_PASSWORD`, `npx wrangler deploy`.
