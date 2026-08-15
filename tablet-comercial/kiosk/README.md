# Tablet Comercial — Kiosk

Menu interativo offline-first para tablets Samsung Galaxy Tab A9+ (retrato, 1200×1920),
rodando dentro de um app kiosk Android (WebView). Interface 100% em pt-BR, sem CDN.

## Rodar em desenvolvimento

```bash
npm install
npm run dev
```

Obs.: o Service Worker (`public/sw.js`) só atua no build de produção.
Para testar offline/vídeo do cache use `npm run build && npm run preview`.

## Build

```bash
npm run build   # roda tsc --noEmit + vite build → dist/
npm run preview # serve o dist/ localmente
```

## Variáveis de ambiente

Copie `.env.example` para `.env`:

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase (default já aponta para produção) |
| `VITE_SUPABASE_ANON_KEY` | Chave anon — usada só no heartbeat (`/rest/v1/devices`) |
| `VITE_PIN_ADMIN` | PIN do menu de manutenção (default `4321`) |

## Arte da home

Coloque `fundo-menu-alelo-1200.png` em `public/` (ver `public/LEIA-ME.txt`).
Prioridade do fundo: `config.fundo_url` do manifest (cache) → PNG do public/ →
gradiente com o nome do evento. O app nunca quebra sem a arte.

## Deploy na Vercel

`vercel.json` já configura o SPA fallback e desativa cache HTTP do `sw.js`
(obrigatório para o tablet detectar shell novo). Basta:

```bash
vercel --prod
```

## Operação no tablet

1. Primeira abertura → tela **Preparar para o evento** → "Baixar tudo" → aguardar 100% + teste automático → "Tudo pronto".
2. Atualizações de conteúdo baixam em segundo plano e são aplicadas na home (banner "Atualizar agora", toque em Início ou timeout de inatividade).
3. Menu de manutenção: toque longo de 5 s no topo da home + PIN.
