# Tablet Comercial — menu interativo para eventos

App web para os tablets **Samsung Galaxy Tab A9+** do time comercial, com admin online.
Conteúdo (PDF e vídeo) baixado uma única vez e servido do armazenamento local — a internet
do evento só é necessária para os links de demonstração.

## Estrutura

```
tablet-comercial/
├── kiosk/              → app dos tablets (Vite + React, PWA)      [Fase 2]
├── admin/              → painel do gestor (Next.js)               [Fase 3]
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql    → tabelas, RLS e permissões
│   │   └── 002_storage.sql   → bucket "conteudo"
│   ├── seed.sql              → config, 6 itens do menu, publicação v1
│   ├── functions/manifest/   → Edge Function GET /manifest
│   └── config.toml
├── PREPARAR_MIDIA.md   → converter vídeo e PDF antes do upload
├── OPERACAO.md         → checklist dos tablets antes do evento    [Fase 4]
└── README.md           → este arquivo
```

**Status:** ✅ Fase 1 (Supabase) pronta · ⬜ Fase 2 (kiosk) · ⬜ Fase 3 (admin) · ⬜ Fase 4 (docs de operação)

---

# Fase 1 — Configurar o Supabase (passo a passo)

Você vai precisar de: uma conta no [supabase.com](https://supabase.com) e um computador
com o navegador. Nenhuma instalação até o passo 4.

## 1. Criar o projeto

1. Entre em [supabase.com/dashboard](https://supabase.com/dashboard) e clique em **New project**.
2. Nome: `tablet-comercial`. Região: **South America (São Paulo)**.
3. Defina uma senha de banco forte e guarde-a (não será usada no dia a dia).
4. Aguarde o projeto ficar verde ("Project is ready").
5. Anote duas coisas em **Project Settings → API**:
   - **Project URL** — algo como `https://abcdefgh.supabase.co`
   - **anon public key** — uma chave longa começando com `eyJ…`

O trecho `abcdefgh` da URL é o **project ref** — vamos usá-lo no passo 4.

## 2. Rodar as migrations

1. No menu lateral do projeto, abra **SQL Editor**.
2. Clique em **New query**, cole o conteúdo **inteiro** de
   `supabase/migrations/001_schema.sql` e clique em **Run**.
   Deve aparecer **Success. No rows returned**.
3. Repita com `supabase/migrations/002_storage.sql`.
4. Repita com `supabase/seed.sql`.

**Se der erro** do tipo `relation "app_config" already exists`: a migration já foi rodada
antes — pule para o próximo arquivo. Qualquer outro erro: copie a mensagem e me mande.

Conferir: em **Table Editor** devem existir as tabelas `app_config`, `menu_items`,
`devices` e `publicacoes` — com 6 linhas em `menu_items` e 1 em `publicacoes`.
Em **Storage** deve existir o bucket **conteudo** (marcado como *Public*).

## 3. Fundo da home

1. Em **Storage → conteudo**, clique em **Upload file** e envie `fundo-menu-alelo-1200.png`.
2. Clique no arquivo enviado → **Get URL** → copie a URL pública.
3. No **SQL Editor**, rode (trocando pela URL copiada):

```sql
update app_config set fundo_url = 'https://SEU-PROJETO.supabase.co/storage/v1/object/public/conteudo/fundo-menu-alelo-1200.png' where id = 1;

update publicacoes
set snapshot = jsonb_set(snapshot, '{config,fundo_url}',
  to_jsonb((select fundo_url from app_config where id = 1)))
where versao = 1;
```

## 4. Publicar a Edge Function /manifest

Este passo usa o terminal. No macOS, abra o **Terminal**; no Windows, o **PowerShell**.
É preciso ter o [Node.js](https://nodejs.org) instalado (versão LTS, instalador padrão).

Na pasta `tablet-comercial/` do projeto, rode um comando por vez:

```bash
npx supabase login
```

→ abre o navegador para você autorizar. Volte ao terminal quando aparecer "Logged in".

```bash
npx supabase functions deploy manifest --project-ref SEU_PROJECT_REF --no-verify-jwt
```

→ troque `SEU_PROJECT_REF` pelo ref anotado no passo 1 (ex.: `abcdefgh`).
Deve terminar com **Deployed Function manifest**.

O `--no-verify-jwt` é proposital: os tablets chamam o manifest sem chave nenhuma.
O manifest não expõe nada sensível — só o cardápio publicado.

## 5. Testar (o curl de aceite)

Troque `SEU-PROJETO` pelo seu project ref e rode:

```bash
curl -i "https://SEU-PROJETO.supabase.co/functions/v1/manifest"
```

**O que deve aparecer:** `HTTP/2 200`, um header `etag: "v1"` e um JSON com
`"versao": 1` e dois itens (`Minha Empresa` e `Portal de Pedidos Alelo POD`).
Os itens de PDF e vídeo **não** aparecem — estão inativos até o upload pelo admin (Fase 3).

Agora o teste do poll barato (o que os tablets fazem a cada 10 min):

```bash
curl -i "https://SEU-PROJETO.supabase.co/functions/v1/manifest" -H 'If-None-Match: "v1"'
```

**O que deve aparecer:** `HTTP/2 304` e **nenhum** corpo — a versão não mudou,
o tablet não gasta rede.

E o teste de segurança — a anon key **não** pode ler as tabelas direto:

```bash
curl -s "https://SEU-PROJETO.supabase.co/rest/v1/menu_items" \
  -H "apikey: SUA_ANON_KEY" -H "Authorization: Bearer SUA_ANON_KEY"
```

**O que deve aparecer:** erro de permissão (`permission denied`) — é o comportamento certo.

Passou nos três? A Fase 1 está pronta. ✅

---

## Fases seguintes

- **Fase 2** — app `/kiosk` (a home precisa do arquivo `fundo-menu-alelo-1200.png`
  em `kiosk/public/`).
- **Fase 3** — admin com upload, validação de mídia e botão Publicar.
- **Fase 4** — `OPERACAO.md` e checklist do app kiosk.
