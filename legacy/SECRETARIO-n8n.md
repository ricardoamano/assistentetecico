# NESTOR Secretário — guia de instalação e uso

O Secretário é a memória da Neostore no WhatsApp. Você manda qualquer coisa
(texto, foto, vídeo, PDF, contato, áudio) e ele guarda organizado. Quando você
pede, ele responde no WhatsApp com a informação **e o arquivo**.

---

## Como funciona (resumo)

```
WhatsApp → Evolution API → N8N (fluxo nestor-secretario)
                              │
                              ├─ 1. Lê a mensagem (texto, mídia, contato, citação)
                              ├─ 2. Confere se o número está autorizado
                              ├─ 3. Baixa o arquivo / transcreve áudio de voz (Whisper)
                              ├─ 4. Claude entende: guardar, buscar, listar, editar, apagar
                              ├─ 5. Executa no Supabase (tabela + Storage)
                              └─ 6. Responde no WhatsApp (texto + arquivos)
```

| Onde fica | O quê |
|-----------|-------|
| Supabase → tabela `nestor_memoria` | Índice de tudo: título, categoria, tags, descrição, dados (medidas etc.) |
| Supabase → Storage → bucket `nestor-arquivos` | Os arquivos em si (fotos, vídeos, PDFs...) — **privado** |

---

## Instalação — passo a passo

### Passo 1 — Banco (Supabase)

1. Abra o Supabase → seu projeto → **SQL Editor** → **New query**.
2. Se ainda não rodou, rode antes `001_initial_schema.sql` e `002_seed_data.sql`.
3. Copie todo o conteúdo de `supabase/migrations/003_secretario.sql`, cole e clique **Run**.
4. Confira:
   - **Table Editor** → deve aparecer a tabela `nestor_memoria`.
   - **Storage** → deve aparecer o bucket `nestor-arquivos` (com cadeado = privado).
5. No **Table Editor → authorized_users**, confirme que seu número real está lá
   com `role = admin` e `active = true` (formato `5511999999999`).

> Pode rodar o 003 mais de uma vez sem problema — ele não duplica nada.

### Passo 2 — Fluxo (N8N)

1. N8N → **Workflows** → **Import from file** → escolha `n8n/flows/nestor-secretario.json`.
2. Confira as variáveis de ambiente (as mesmas do resto do NESTOR):
   `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
   `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.
3. Se o N8N for auto-hospedado, garanta que o acesso a variáveis está liberado:
   `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`.
4. **Salve** e ative o fluxo (botão **Active**).
5. Abra o nó **Webhook Evolution** e copie a **Production URL**
   (algo como `https://seu-n8n.com/webhook/nestor-secretario`).

### Passo 3 — Ligar o WhatsApp (Evolution API)

Na Evolution API, configure o webhook da instância:

- **URL:** a Production URL do passo anterior
- **Eventos:** `MESSAGES_UPSERT`
- **Webhook Base64:** pode deixar ligado (o fluxo usa se vier; se não vier, ele baixa sozinho)

> ⚠️ A Evolution manda os eventos de uma instância para **uma** URL. Hoje o
> fluxo principal (`nestor-main`) ainda está incompleto, então o recomendado é
> apontar o webhook para o Secretário. Veja "Próximos passos" no fim.

### Passo 4 — Testar

Mande do seu WhatsApp para o número do NESTOR:

| Teste | O que mandar | Resposta esperada |
|-------|--------------|-------------------|
| Guardar texto | `Totem touch 43: altura 1,80 m, largura 0,60 m, tela 1920x1080` | `✅ Guardado #1 — ...` |
| Guardar foto | Foto de uma etiqueta (com ou sem legenda) | `✅ Guardado #2 — ...` com as medidas lidas da foto |
| Guardar PDF | Um manual em PDF | `✅ Guardado #3 — ...` |
| Buscar | `qual a medida do totem de 43?` | Resposta com as medidas |
| Buscar arquivo | `me manda a foto da etiqueta` | Texto + a foto |
| Por número | `me manda o #3` | O PDF |
| Listar | `o que tem salvo?` | Categorias e quantidades |
| Áudio | Grave: "me manda o manual do projetor" | Igual a uma busca |
| Não autorizado | Mande de outro número | "não reconheço seu número" |

Se algo falhar: N8N → **Executions** → abra a execução com erro → veja qual nó ficou vermelho.

---

## Como usar no dia a dia

**Guardar**
- Mande o texto ou o arquivo. Legenda ajuda, mas não é obrigatória — em fotos, o
  Claude lê o que está escrito (medidas, modelo, plaqueta) e descreve.
- Mandou uma foto sem legenda e quer explicar depois? **Responda (cite) a foto**
  com a explicação. Ele guarda a foto com esse contexto.
- Contatos: compartilhe o cartão de contato do freelancer. Ele guarda nome e telefone.

**Buscar**
- Pergunte normal: "qual a resolução do tablet da Samsung?", "quem é o freela de som?",
  "me manda os vídeos de montagem do totem".
- Ele entende sinônimos e erros de digitação ("etiqeta zebra" acha "Etiqueta Zebra").

**Organizar**
- `renomeia o #12 para Totem 55 — medidas`
- `muda o último para categoria tvs`
- `deixa o #12 privado` / `libera o #12 pra equipe`
- `lista os totens`
- `apaga o #12` (só com o número, para evitar apagar errado)

**Privacidade**
- Itens com telefone, CPF, PIX, endereço ou valores ficam **privados (🔒)**
  automaticamente — só admin vê.
- Técnicos (`role = tecnico`) **só buscam e listam** itens da equipe. Guardar,
  editar e apagar é só admin.

---

## Limites e cuidados

| Ponto | Detalhe |
|-------|---------|
| Tamanho de arquivo | Até **50 MB** por arquivo (limite do Supabase gratuito). Vídeo maior: mande o link do Drive/YouTube. |
| Espaço total | Supabase gratuito tem **1 GB** de Storage. Muitos vídeos enchem rápido — o plano Pro (US$ 25/mês) tem 100 GB. |
| Leitura de conteúdo | O Claude **lê** fotos (até ~4,5 MB) e PDFs (até 20 MB). Vídeos, Word, Excel: ele guarda o arquivo e usa só o nome + legenda para achar depois. Escreva uma legenda boa nesses casos. |
| Links enviados | Os arquivos saem por link temporário (1 hora). Ninguém de fora acessa o bucket. |
| Custo estimado | Por mensagem: centavos (Claude + embedding). PDFs grandes custam mais porque o Claude lê o documento inteiro. |
| Histórico de execuções | O fluxo **não salva** execuções com sucesso no N8N (para não lotar o banco com arquivos). Execuções com erro ficam salvas para diagnóstico. |

---

## Próximos passos (sugestões)

1. **Unificar com o fluxo principal**: quando agenda e escalação estiverem
   prontos, o `nestor-main` passa a chamar o Secretário como sub-fluxo (ou o
   contrário), usando um único webhook.
2. **Importar o que já existe**: planilha de freelancers, pasta de manuais no Drive —
   dá para fazer uma carga inicial em lote.
3. **Painel web** simples para ver/editar a memória fora do WhatsApp.
