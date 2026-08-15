# PREPARAR MÍDIA — antes de subir no admin

Guia prático para deixar vídeo e PDF no formato que o **Samsung Galaxy Tab A9+** toca sem travar.
Faça isso **antes** de subir os arquivos no admin.

---

## Por que isso importa

O tablet abre o conteúdo dentro de um WebView Android. Ele **não decodifica** H.265/HEVC,
VP9 nem AV1 de forma confiável — e é exatamente nisso que muitos exportadores de vídeo
salvam por padrão hoje. Se o vídeo estiver no codec errado, a tela fica preta no estande
e não há o que fazer no local. Converter leva 3 minutos e resolve de vez.

**A regra é uma só: MP4 / H.264 / AAC.**

---

## 1. Instalar o ffmpeg (uma vez só)

**macOS** (com Homebrew):

```bash
brew install ffmpeg
```

Se não tiver o Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Windows**: baixe em https://www.gyan.dev/ffmpeg/builds/ (pacote `release full`),
descompacte em `C:\ffmpeg` e adicione `C:\ffmpeg\bin` ao PATH.

Conferir se instalou:

```bash
ffmpeg -version
```

---

## 2. Descobrir o que tem no seu vídeo

```bash
ffprobe -v error -show_entries stream=codec_name,width,height,bit_rate -of default=noprint_wrappers=1 video-original.mp4
```

O que você quer ver:

- `codec_name=h264` → **ok**
- `codec_name=hevc` ou `av1` ou `vp9` → **precisa converter**

---

## 3. Converter o vídeo (comando principal)

Use este. Serve para 99% dos casos:

```bash
ffmpeg -i video-original.mp4 \
  -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p \
  -crf 23 -preset slow -g 60 \
  -vf "scale='min(1920,iw)':-2" \
  -c:a aac -b:a 128k -ac 2 -ar 48000 \
  -movflags +faststart \
  video-tablet.mp4
```

O que cada parte faz, em português:

| Trecho | Para quê |
|---|---|
| `libx264 / high / yuv420p` | codec que o tablet decodifica por hardware |
| `-crf 23` | qualidade. **Menor = melhor e mais pesado.** 20 é ótimo, 26 é econômico |
| `-preset slow` | comprime melhor (demora mais para converter, o arquivo fica menor) |
| `-g 60` | keyframe a cada 2 s → arrastar o vídeo fica rápido e preciso |
| `scale='min(1920,iw)':-2` | limita a 1920 de largura, mantendo a proporção |
| `aac 128k` | áudio que o tablet toca |
| `+faststart` | move o índice para o começo do arquivo — **sem isso o vídeo demora a abrir** |

### Se o arquivo ainda ficar acima de 150 MB

Force o tamanho por bitrate (exemplo: alvo de ~2,5 Mbps, dois passes):

```bash
ffmpeg -y -i video-original.mp4 -c:v libx264 -b:v 2500k -pass 1 -an -f mp4 /dev/null && \
ffmpeg -i video-original.mp4 -c:v libx264 -b:v 2500k -pass 2 \
  -profile:v high -pix_fmt yuv420p -g 60 \
  -c:a aac -b:a 128k -movflags +faststart video-tablet.mp4
```

Conta rápida do tamanho final:

**MB ≈ (bitrate em Mbps ÷ 8) × duração em segundos.**
2,5 Mbps × 5 min (300 s) ÷ 8 ≈ **94 MB**.

### Se o vídeo for vertical (feito para o tablet em pé)

```bash
ffmpeg -i video-original.mp4 \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 23 -preset slow -g 60 \
  -vf "scale=1080:-2" \
  -c:a aac -b:a 128k -movflags +faststart \
  video-tablet.mp4
```

---

## 4. Conferir se ficou certo

```bash
ffprobe -v error -show_entries stream=codec_name,width,height -show_entries format=size,duration -of default=noprint_wrappers=1 video-tablet.mp4
```

Checklist:

- [ ] `codec_name=h264` e `codec_name=aac`
- [ ] tamanho abaixo de **150 MB**
- [ ] abre e roda no Chrome do computador arrastando o arquivo para uma aba
- [ ] arrastar a barra para o meio e para o fim funciona

---

## 5. PDF: deixar leve

PDF de portfólio costuma vir com imagens em 300 dpi — desnecessário numa tela de 11".
Reduzir para 150 dpi corta o arquivo em 3 a 5 vezes, sem diferença visível no tablet.

**macOS / Linux** (Ghostscript — instalar com `brew install ghostscript`):

```bash
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.5 \
   -dPDFSETTINGS=/ebook \
   -dDownsampleColorImages=true -dColorImageResolution=150 \
   -dDownsampleGrayImages=true -dGrayImageResolution=150 \
   -dNOPAUSE -dQUIET -dBATCH \
   -sOutputFile=portfolio-tablet.pdf portfolio-original.pdf
```

Se ficar com imagem visivelmente ruim, troque `/ebook` por `/printer` (fica maior, mas melhor).

Checklist do PDF:

- [ ] abaixo de **40 MB**
- [ ] até **80 páginas**
- [ ] sem senha de abertura
- [ ] abre no Chrome do computador e passa páginas sem engasgar

---

## 6. Nome dos arquivos

Use nomes simples, sem acento, espaço ou caractere especial:

```
alelo-portfolio.pdf
alelo-multisservicos.pdf
onboarding-digital-first.mp4
```

O sistema renomeia tudo para o hash no momento do upload, mas nome limpo evita problema
no caminho até lá.

---

## 7. Ordem certa de trabalho

1. Baixar o arquivo original do Google Drive.
2. Converter com os comandos acima.
3. Testar no Chrome do computador.
4. Subir no admin → o admin roda a validação automática e mostra ✅ ou ⛔.
5. Ativar o item e clicar em **Publicar**.
6. Nos tablets, abrir **Preparar para o evento** e baixar tudo — **no Wi-Fi do escritório**,
   nunca no dia do evento.
