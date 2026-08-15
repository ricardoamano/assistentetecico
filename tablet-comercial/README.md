# Tablet Comercial — Alelo

Menu interativo para tablets Samsung Galaxy Tab A9+ (retrato, 1200×1920) usados pelo
time comercial em eventos. Os tablets abrem uma URL única dentro do app kiosk; todo
arquivo (PDF, vídeo) é baixado **uma única vez** e funciona **sem internet**. Um admin
online controla conteúdo, ordem e configurações — nada chega aos tablets antes de
clicar em **Publicar**.

## Estado do projeto

| Fase | O que é | Status |
|---|---|---|
| **Fase 1** | Supabase: banco, segurança, bucket, Edge Function `/manifest` | ✅ pronta para instalar (este guia) |
| Fase 2 | App do tablet (`/kiosk`) | ⏳ aguardando teste da Fase 1 |
| Fase 3 | Painel do gestor (`/admin`) | ⏳ |
| Fase 4 | Guias `PREPARAR_MIDIA.md` e `OPERACAO.md` | ⏳ |

---

# Fase 1 — Instalar o backend (Supabase)

Você vai precisar de:

- uma conta em [supabase.com](https://supabase.com) (o plano gratuito serve para testar);
- **Node.js** instalado no computador (baixe em [nodejs.org](https://nodejs.org), versão LTS,
  instalação padrão "avançar, avançar, concluir") — só é usado no Passo 4.

## Passo 1 — Criar o projeto no Supabase

1. Entre em [supabase.com/dashboard](https://supabase.com/dashboard) e clique em **New project**.
2. Preencha:
   - **Name**: `tablet-comercial`
   - **Database password**: clique em **Generate a password** e **guarde essa senha**.
   - **Region**: `South America (São Paulo)`.
3. Clique em **Create new project** e aguarde 1–2 minutos até o projeto ficar verde ("Project is ready").
4. Anote duas coisas (vamos usar depois). No menu lateral, **Project Settings → API**:
   - **Project URL** — algo como `https://abcdefghij.supabase.co`
   - **Reference ID** (em General) — o código `abcdefghij` que aparece dentro da URL.

## Passo 2 — Criar as tabelas (SQL)

1. No menu lateral do projeto, clique em **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo `supabase/migrations/001_schema.sql` desta pasta, copie **todo** o
   conteúdo, cole no editor e clique em **Run** (ou Ctrl+Enter).
   - Deve aparecer **"Success. No rows returned"**.
4. Repita o mesmo processo, **nesta ordem**, para:
   - `supabase/migrations/002_rls.sql`
   - `supabase/migrations/003_storage.sql`
   - `supabase/seed.sql` — este último termina mostrando uma linha com o número `1`
     (é a versão 1 sendo publicada).

**Se o 003_storage.sql der erro** dizendo algo como *"must be owner of table objects"*:

1. No menu lateral, vá em **Storage → New bucket**.
2. Nome: `conteudo` · marque **Public bucket** · **Save**.
3. Volte ao SQL Editor e rode de novo o `003_storage.sql` **sem as primeiras linhas do
   `insert into storage.buckets`** (só as partes de `create policy`). Se as policies também
   falharem, crie-as em **Storage → Policies → New policy** com as mesmas regras
   (leitura pública; escrita só autenticado).

## Passo 3 — Conferir se o banco ficou certo

Ainda no SQL Editor, rode:

```sql
select versao, publicado_por from publicacoes;
```

Deve aparecer **uma linha**: `versao = 1`, `publicado_por = seed`.

```sql
select ordem, titulo, tipo, ativo from menu_items order by ordem;
```

Devem aparecer **6 linhas** — só as de ordem 4 e 5 (Minha Empresa e Portal de Pedidos)
com `ativo = true`. É o esperado: os itens de arquivo nascem inativos até o upload pelo admin.

## Passo 4 — Publicar a Edge Function `/manifest`

Abra o **terminal** (no Windows: menu Iniciar → digite `cmd` → Enter) e rode os comandos
abaixo, um por vez, **dentro da pasta `tablet-comercial`** deste repositório
(use `cd caminho/da/pasta` para chegar até ela):

```bash
npx supabase login
```

- Vai abrir o navegador pedindo para autorizar. Clique em **Authorize** e volte ao terminal.

```bash
npx supabase link --project-ref SEU_REFERENCE_ID
```

- Troque `SEU_REFERENCE_ID` pelo Reference ID anotado no Passo 1 (ex.: `abcdefghij`).
- Se pedir a senha do banco, cole a senha guardada no Passo 1 (pode dar Enter se só quiser pular).

```bash
npx supabase functions deploy manifest --no-verify-jwt
```

- O `--no-verify-jwt` é **obrigatório**: os tablets não têm login, o manifest é público.
- Ao final deve aparecer **"Deployed Functions on project … manifest"**.

## Passo 5 — Testar (o teste da Fase 1)

Troque `SEU-PROJETO` pela Project URL do Passo 1.

**Teste A — o manifest responde** (pode ser no terminal ou colando a URL no navegador):

```bash
curl -s https://SEU-PROJETO.supabase.co/functions/v1/manifest
```

Resposta esperada (resumida): um JSON com `"versao": 1`, o bloco `"config"` com
`"nome_evento": "Alelo — Tablet Comercial"` e `"itens"` com **2 itens**
(Minha Empresa e Portal de Pedidos Alelo POD), ambos com `"requer_internet": true`.

**Teste B — o poll barato (ETag / 304)**:

```bash
curl -si https://SEU-PROJETO.supabase.co/functions/v1/manifest | grep -i etag
```

Deve mostrar `etag: "v1"`. Agora:

```bash
curl -si -H 'If-None-Match: "v1"' https://SEU-PROJETO.supabase.co/functions/v1/manifest
```

Deve responder **`HTTP/2 304`** e **sem corpo** — é assim que o tablet pergunta
"tem novidade?" gastando poucos bytes na rede ruim do evento.

**Teste C — rascunho não vaza.** No SQL Editor:

```sql
update menu_items set titulo = 'TESTE RASCUNHO' where ordem = 4;
```

Rode o Teste A de novo: o manifest **continua mostrando "Minha Empresa"** — editar sem
publicar não afeta os tablets. Publique para ver a mudança:

```sql
select publicar_versao('teste');
```

Teste A agora mostra `"versao": 2` e o título novo. Desfaça:

```sql
update menu_items set titulo = 'Minha Empresa' where ordem = 4;
select publicar_versao('teste');
```

**Teste D — segurança.** As tabelas não podem ser lidas com a chave pública:

```bash
curl -s "https://SEU-PROJETO.supabase.co/rest/v1/menu_items?select=*" \
  -H "apikey: SUA_CHAVE_ANON"
```

(a chave anon está em Project Settings → API → `anon public`). A resposta deve ser
`[]` ou erro de permissão — **nunca** a lista de itens.

## Passo 6 (opcional agora) — Subir o fundo da tela

1. **Storage → conteudo → Upload file** → envie `fundo-menu-alelo-1200.png`.
2. No SQL Editor, rode o UPDATE que está comentado no fim do `supabase/seed.sql`
   (trocando `SEU-PROJETO`) e depois `select publicar_versao('seed');`.

O app do tablet (Fase 2) também traz o fundo embutido, então este passo pode ficar
para depois sem travar nada.

## Se der errado

| Sintoma | Causa provável | Solução |
|---|---|---|
| `relation "app_config" already exists` | migration rodada duas vezes | pode ignorar se o Passo 3 confere |
| Função responde `401` / `Missing authorization header` | deploy sem `--no-verify-jwt` | rode o Passo 4 de novo com a flag |
| Função responde `500` com "publicação … não encontrada" | seed não rodou | rode o `seed.sql` (Passo 2.4) |
| `curl` não é reconhecido (Windows antigo) | sem curl | cole a URL do Teste A direto no navegador |

---

## Estrutura desta pasta

```
tablet-comercial/
├── kiosk/                      → app do tablet (Fase 2)
├── admin/                      → painel do gestor (Fase 3)
├── supabase/
│   ├── config.toml             → config do CLI (manifest sem JWT)
│   ├── migrations/
│   │   ├── 001_schema.sql      → tabelas + funções publicar/reverter
│   │   ├── 002_rls.sql         → segurança (RLS + permissões)
│   │   └── 003_storage.sql     → bucket "conteudo" + políticas
│   ├── seed.sql                → config, 6 cards e publicação da v1
│   └── functions/manifest/     → Edge Function GET /manifest
├── PREPARAR_MIDIA.md           → (Fase 4) conversão de vídeo e PDF
├── OPERACAO.md                 → (Fase 4) checklist dos tablets
└── README.md                   → este arquivo
```

## Como o versionamento funciona (resumo para o gestor)

- Editar itens no admin **não muda nada** nos tablets.
- **Publicar** congela um snapshot (`publicacoes`) e avança `versao_publicada`.
- O tablet consulta `/manifest`; se a versão for maior que a dele, baixa em segundo
  plano e só aplica na home. A decisão de baixar cada arquivo é **pelo hash** — trocar
  ordem ou título não rebaixa arquivo nenhum.
- **Reverter** republica o conteúdo anterior com um número **novo** (a numeração nunca
  volta para trás — é o que mantém os tablets consistentes).
