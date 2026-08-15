# OPERAÇÃO — checklist dos tablets antes do evento

Guia de campo. Siga na ordem. Tempo total: ~20 min para 3 tablets, **na véspera**,
no Wi-Fi do escritório — nunca deixe para o dia do evento.

---

## 1. Conferir o app kiosk (uma vez por tablet, na configuração inicial)

O app web roda dentro do app kiosk Android. Nas configurações do kiosk, confira:

- [ ] **URL inicial** apontando para o app dos tablets (a URL `/kiosk` publicada na Vercel).
- [ ] **JavaScript habilitado.**
- [ ] **Service Worker / armazenamento habilitados** — o kiosk **não pode limpar
      cache/dados ao reiniciar**. Se houver opção "clear cache on restart" ou
      "limpar dados ao sair", **desligue**. É isso que guarda os vídeos e PDFs offline.
- [ ] **Zoom desativado** no kiosk (o app já bloqueia o duplo toque, mas o kiosk
      não deve oferecer zoom próprio).
- [ ] **Orientação travada em retrato** (em pé).
- [ ] Botões físicos e barra do Android bloqueados pelo kiosk (é a função dele).

## 2. Carregar o conteúdo (véspera, no escritório)

1. Confirme com o gestor que o conteúdo está **publicado** no admin
   (aba **Publicar** sem pendências, nenhum item ⛔).
2. Em cada tablet, abra o app. Na primeira vez, a tela **"Preparar para o evento"**
   abre sozinha. Se não abrir: toque e segure o topo da tela por 5 s → digite o PIN →
   **Preparar para o evento**.
3. Toque em **Baixar tudo** e aguarde todos os itens ficarem ✅.
   - Algum item ❌? Toque em **Tentar de novo os que falharam**.
   - Persistiu? Anote o motivo mostrado e avise o gestor — geralmente é arquivo
     no formato errado (ver `PREPARAR_MIDIA.md`).
4. Só considere o tablet pronto quando aparecer **"Tudo pronto"**.

## 3. Teste final offline (o teste que importa)

Em cada tablet:

- [ ] Ative o **modo avião**.
- [ ] O menu abre normalmente.
- [ ] Abra o PDF do portfólio → passa páginas sem engasgar.
- [ ] Abra o vídeo → toca, e **arrastar a barra até o fim funciona**.
- [ ] Toque num card de demonstração (link) → deve aparecer "Sem conexão no momento"
      (é o esperado sem internet; no evento, com Wi-Fi, ele abre).
- [ ] Toque em **⌂ Início** → volta ao menu.
- [ ] Desative o modo avião.

## 4. Checklist físico (dia do evento, antes de sair)

- [ ] Tablets 100% carregados + carregadores e cabos na mala.
- [ ] Suportes/bases dos tablets.
- [ ] Wi-Fi do evento: nome e senha anotados (para os links de demonstração).
- [ ] PIN do menu local anotado com o responsável.
- [ ] Telefone do gestor do admin para emergências de conteúdo.

## 5. Durante o evento

- **Mudou o conteúdo?** O gestor publica no admin; o tablet baixa sozinho em segundo
  plano e mostra o aviso no rodapé. Tocar em **Atualizar agora** (ou em **Início**)
  aplica. Ninguém que estiver usando é interrompido.
- **Tela preta / travou?** O app se recupera sozinho em segundos. Se não voltar,
  feche e reabra o app kiosk — o conteúdo continua no tablet, nada é rebaixado.
- **Painel Dispositivos** (no admin): mostra cada tablet, versão e bateria.
  🟢 em dia · 🟡 baixando · 🔴 sem contato há 30 min — vá olhar o tablet.

## 6. Depois do evento

- Nada a fazer nos tablets — o conteúdo fica pronto para o próximo evento.
- Para trocar a campanha: o gestor edita e publica no admin; na véspera do próximo
  evento, repita os passos 2 e 3.
