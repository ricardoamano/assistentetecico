# Neostore Link

Pad de texto estilo dontpad.com, só que fechado:

- Cada endereço `link.neostore.app/nome` pede um **PIN numérico** (4 a 8 dígitos).
- Depois do PIN, o texto fica na tela por **N segundos** (barra + cronômetro). Zerou, a tela volta para o PIN e o texto some.
- Quem abriu pode **editar** durante a janela (autosave). O admin pode deixar um link como somente leitura.
- O painel de **superadmin** fica em outro endereço (`/admin` por padrão, você pode trocar) com senha própria. Lá você cria links, define PIN, tempo e conteúdo, e ajusta o tempo padrão global.

Tudo roda em um único arquivo (`worker.js`) na Cloudflare Workers, plano gratuito. Não tem banco para pagar, nem servidor para manter.

---

## O que você precisa

1. Conta na Cloudflare (gratuita): https://dash.cloudflare.com
2. O domínio `neostore.app` adicionado como zona na Cloudflare (DNS gerenciado por ela). Se ainda não está, adicione em **Websites → Add a site** e troque os nameservers no registrador.

---

## Instalação pelo painel (sem instalar nada no computador)

### 1. Criar o Worker
1. No painel: **Workers & Pages → Create → Create Worker**.
2. Nome: `neostore-link`. Clique em **Deploy** (sobe um "Hello World", tudo bem).
3. Clique em **Edit code**, apague tudo, cole o conteúdo de `worker.js` e clique em **Deploy**.

### 2. Criar o armazenamento (KV)
1. Menu **Storage & Databases → KV → Create a namespace**. Nome: `neostore-link-pads`.
2. Volte no Worker → **Settings → Bindings → Add → KV namespace**.
   - Variable name: `PADS` (exatamente assim, maiúsculo)
   - KV namespace: `neostore-link-pads`
3. Salve.

### 3. Senha do superadmin e endereço do painel
Em **Settings → Variables and Secrets → Add**:

| Tipo | Nome | Valor |
|------|------|-------|
| **Secret** | `ADMIN_PASSWORD` | a senha do superadmin (forte, não é o PIN) |
| Text | `ADMIN_PATH` | caminho do painel, ex.: `painel-ns-2026` (sem barra) |
| Text | `BRAND_NAME` | `Neostore Link` (opcional) |

Salve e faça **Deploy** de novo se o painel pedir.

### 4. Domínio `link.neostore.app`
1. Worker → **Settings → Domains & Routes → Add → Custom domain**.
2. Digite `link.neostore.app` e confirme. A Cloudflare cria o DNS e o certificado sozinha (1 a 5 minutos).

### 5. Testar
1. Abra `https://link.neostore.app/painel-ns-2026` (ou o caminho que você definiu em `ADMIN_PATH`).
2. Entre com a senha do superadmin.
3. Ajuste o **tempo padrão** (segundos).
4. Crie um link: nome `teste`, PIN `2468`, conteúdo qualquer. Clique em **Salvar link**.
5. Abra `https://link.neostore.app/teste` em outra aba ou no celular, digite o PIN e veja o cronômetro.

---

## Instalação por linha de comando (alternativa)

```bash
cd link
npx wrangler login
npx wrangler kv namespace create PADS     # copie o "id" para o wrangler.toml
npx wrangler secret put ADMIN_PASSWORD
npx wrangler deploy
```

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
| Tempo de exposição | 5 s a 3600 s, padrão 60 s | painel (global ou por link); limites em `DEFAULTS` no `worker.js` |
| PIN | 4 a 8 dígitos | `DEFAULTS.pinMin/pinMax` |
| Tentativas de PIN | 8 por IP a cada 10 min por link | `DEFAULTS.rateLimitMax/rateLimitWindow` |
| Sessão do superadmin | 12 horas | `DEFAULTS.adminSessionHours` |
| Tamanho do texto | 500 KB por link | `DEFAULTS.contentMaxBytes` |
| Cores | variáveis no topo de `BASE_CSS` | `worker.js` |

---

## O que é e o que não é seguro aqui

- O PIN é curto e numérico porque você pediu simples. O limitador de tentativas dificulta chute automático, mas **não use para senha de banco, cartão ou dados de cliente**. É para informação operacional de evento (wifi, ramal, endereço, checklist).
- O PIN fica visível no painel de propósito, para você conseguir repassar à equipe.
- Quem tirar print durante a janela fica com o texto. O tempo limita exposição acidental, não vazamento intencional.
- O painel só é protegido pela senha do superadmin. Use senha longa e troque o `ADMIN_PATH` para algo não óbvio.
- Se você trocar `ADMIN_PASSWORD`, todas as sessões do painel caem (é o esperado).
- Edição é "último que salva vence". Para duas pessoas digitando ao mesmo tempo no mesmo link, o texto de uma pode sobrescrever o da outra.

## Custo

Plano gratuito da Cloudflare Workers: 100 mil requisições/dia e KV com 1 GB. Para uso interno da equipe, não passa disso.
