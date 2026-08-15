# Tablet Comercial — Admin

Painel do gestor: controla o conteúdo, a publicação de versões e o monitoramento dos tablets de evento. Interface 100% em pt-BR. Login por e-mail/senha via Supabase Auth.

## Rodar em desenvolvimento

```bash
cd admin
npm install
cp .env.example .env.local   # preencha a anon key
npm run dev                  # http://localhost:3000
```

## Build de produção

```bash
npm run build
npm start
```

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase (default: `https://sbsjiiquxesyjtskjuyw.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key do projeto (Dashboard → Settings → API) |

## Deploy na Vercel

1. Importe o repositório na Vercel e aponte o **Root Directory** para `tablet-comercial/admin`.
2. Configure as duas variáveis de ambiente acima (Production e Preview).
3. Framework: Next.js (detectado automaticamente). Build: `npm run build`.
4. Deploy. A sessão de login é mantida no navegador pelo próprio supabase-js.

## Criar o usuário do gestor

No Supabase Dashboard → **Authentication → Users → Add user**:

- E-mail e senha do gestor;
- Marque **Auto Confirm User** (senão o login falha com "e-mail não confirmado").

Qualquer usuário autenticado tem acesso total ao admin (RLS: `authenticated` pode tudo; `anon` não lê nada).

## Observações

- Arquivos vão para o bucket público `conteudo` como `{sha256}.{ext}` (hash calculado no navegador). Miniaturas: `thumb-{sha256}.png` (400 px de largura).
- A validação de mídia (MP4 H.264/AAC, faststart, PDF com senha etc.) roda no navegador ANTES do upload; resultado ⛔ impede anexar o arquivo ao item.
- Excluir um item não apaga os arquivos do bucket (o nome por hash permite compartilhamento entre itens e versões antigas ainda referenciam os arquivos).
- Publicar cria um snapshot imutável em `publicacoes` e avança `app_config.versao_publicada`. Reverter cria uma versão NOVA com o snapshot anterior — versões só andam para frente.
