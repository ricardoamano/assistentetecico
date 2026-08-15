/**
 * Validação de mídia — roda 100% no navegador, ANTES do upload.
 *
 * Resultado:
 *   - "bloqueado" → NÃO salva o arquivo no item (mostra o motivo);
 *   - "aviso"     → salva com midia_ok = true e midia_aviso preenchido;
 *   - "ok"        → salva limpo.
 */

export interface ResultadoValidacao {
  status: "ok" | "aviso" | "bloqueado";
  motivoBloqueio?: string;
  avisos: string[];
  thumbBlob: Blob | null;
  largura?: number;
  altura?: number;
  paginas?: number;
}

const LIMITE_VIDEO_MB = 150;
const LIMITE_PDF_MB = 40;
const LIMITE_PDF_PAGINAS = 80;
const THUMB_LARGURA = 400;

// ---------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------

function mb(bytes: number): number {
  return bytes / (1024 * 1024);
}

function fmtMB(bytes: number): string {
  return `${mb(bytes).toFixed(0)} MB`;
}

/** Procura a sequência ASCII `needle` em `bytes`; retorna o índice ou -1. */
function indexOfAscii(bytes: Uint8Array, needle: string, from = 0): number {
  const n = needle.split("").map((c) => c.charCodeAt(0));
  outer: for (let i = from; i <= bytes.length - n.length; i++) {
    for (let j = 0; j < n.length; j++) {
      if (bytes[i + j] !== n[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function canvasParaPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

function desenhaThumb(
  fonte: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  larguraFonte: number,
  alturaFonte: number
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  const escala = THUMB_LARGURA / Math.max(1, larguraFonte);
  canvas.width = THUMB_LARGURA;
  canvas.height = Math.max(1, Math.round(alturaFonte * escala));
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(fonte, 0, 0, canvas.width, canvas.height);
  return canvasParaPng(canvas);
}

// ---------------------------------------------------------------
// VÍDEO
// ---------------------------------------------------------------

/**
 * Parse leve de MP4 sobre os primeiros MB:
 * procura strings de codec (boxes stsd) e a ordem moov/mdat (faststart).
 */
function inspecionaMp4(buffer: ArrayBuffer): {
  codecRuim: string | null;
  temFtyp: boolean;
  semFaststart: boolean;
} {
  const janela = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 8 * 1024 * 1024)));

  const posFtyp = indexOfAscii(janela, "ftyp");
  const temFtyp = posFtyp >= 0 && posFtyp <= 16;

  // Procura os codecs só nas vizinhanças dos boxes `stsd` (dentro do moov),
  // para não dar falso positivo com bytes aleatórios do mdat.
  const ruins = ["hev1", "hvc1", "vp09", "av01"];
  let codecRuim: string | null = null;
  let posStsd = indexOfAscii(janela, "stsd");
  while (posStsd >= 0 && !codecRuim) {
    const regiao = janela.subarray(posStsd, Math.min(janela.length, posStsd + 2048));
    for (const c of ruins) {
      if (indexOfAscii(regiao, c) >= 0) {
        codecRuim = c;
        break;
      }
    }
    posStsd = indexOfAscii(janela, "stsd", posStsd + 4);
  }

  const posMoov = indexOfAscii(janela, "moov");
  const posMdat = indexOfAscii(janela, "mdat");
  // faststart ok = moov aparece antes do mdat nos primeiros bytes.
  const semFaststart = !(posMoov >= 0 && (posMdat < 0 || posMoov < posMdat));

  return { codecRuim, temFtyp, semFaststart };
}

/** Teste prático: o navegador consegue abrir o vídeo? Gera a thumb (seek 0,5 s). */
function testePraticoVideo(
  arquivo: File
): Promise<{ ok: boolean; largura: number; altura: number; thumb: Blob | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(arquivo);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;

    let terminado = false;
    const finaliza = (ok: boolean, largura = 0, altura = 0, thumb: Blob | null = null) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
      resolve({ ok, largura, altura, thumb });
    };

    const timer = setTimeout(() => finaliza(false), 5000);

    video.onerror = () => finaliza(false);
    video.onloadedmetadata = () => {
      const largura = video.videoWidth;
      const altura = video.videoHeight;
      if (!largura || largura <= 0) {
        finaliza(false);
        return;
      }
      // metadata ok — agora seek 0,5 s para a thumb
      const gerarThumb = async () => {
        try {
          const blob = await desenhaThumb(video, largura, altura);
          finaliza(true, largura, altura, blob);
        } catch {
          finaliza(true, largura, altura, null);
        }
      };
      video.onseeked = () => void gerarThumb();
      try {
        video.currentTime = Math.min(0.5, Math.max(0, (video.duration || 1) - 0.1));
        // Guarda: se o `seeked` não disparar (vídeos muito curtos), gera assim mesmo.
        setTimeout(() => void gerarThumb(), 2000);
      } catch {
        void gerarThumb();
      }
    };
  });
}

export async function validarVideo(arquivo: File, buffer: ArrayBuffer): Promise<ResultadoValidacao> {
  const avisos: string[] = [];

  // Container .mp4 obrigatório
  const nomeMp4 = arquivo.name.toLowerCase().endsWith(".mp4");
  const { codecRuim, temFtyp, semFaststart } = inspecionaMp4(buffer);
  if (!nomeMp4 || !temFtyp) {
    return {
      status: "bloqueado",
      motivoBloqueio:
        "O arquivo não é um .mp4 válido. Converta com o comando do guia PREPARAR_MIDIA.md.",
      avisos,
      thumbBlob: null,
    };
  }

  // Codec incompatível → bloqueia
  if (codecRuim) {
    return {
      status: "bloqueado",
      motivoBloqueio:
        "Este vídeo não vai tocar no tablet. Converta com o comando do guia PREPARAR_MIDIA.md.",
      avisos,
      thumbBlob: null,
    };
  }

  // Teste prático no <video>
  const teste = await testePraticoVideo(arquivo);
  if (!teste.ok) {
    return {
      status: "bloqueado",
      motivoBloqueio:
        "O navegador não conseguiu abrir este vídeo (metadados não carregaram em 5 s). " +
        "Converta com o comando do guia PREPARAR_MIDIA.md.",
      avisos,
      thumbBlob: null,
    };
  }

  // Avisos
  if (teste.largura > 1920 || teste.altura > 1080) {
    avisos.push(
      `Resolução ${teste.largura}×${teste.altura} acima de 1920×1080 — o tablet pode engasgar.`
    );
  }
  if (arquivo.size > LIMITE_VIDEO_MB * 1024 * 1024) {
    const minutos = Math.ceil(mb(arquivo.size) / 2 / 60); // ~2 MB/s em Wi-Fi de evento
    avisos.push(
      `Arquivo grande (${fmtMB(arquivo.size)}) — cada tablet vai levar ~${Math.max(1, minutos)} min para baixar em Wi-Fi de evento.`
    );
  }
  if (semFaststart) {
    avisos.push("Sem faststart — o vídeo vai demorar a abrir. Reprocesse com PREPARAR_MIDIA.md.");
  }

  return {
    status: avisos.length ? "aviso" : "ok",
    avisos,
    thumbBlob: teste.thumb,
    largura: teste.largura,
    altura: teste.altura,
  };
}

// ---------------------------------------------------------------
// PDF
// ---------------------------------------------------------------

let pdfjsPronto: Promise<typeof import("pdfjs-dist")> | null = null;

async function carregaPdfjs() {
  if (!pdfjsPronto) {
    pdfjsPronto = import("pdfjs-dist").then((pdfjs) => {
      // Worker servido pelo próprio app (copiado em scripts/copy-pdf-worker.mjs) — sem CDN.
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.mjs";
      return pdfjs;
    });
  }
  return pdfjsPronto;
}

export async function validarPdf(arquivo: File, buffer: ArrayBuffer): Promise<ResultadoValidacao> {
  const avisos: string[] = [];
  const pdfjs = await carregaPdfjs();

  // pdfjs transfere o buffer para o worker — passa uma CÓPIA para
  // não invalidar o buffer usado no hash/upload.
  const copia = new Uint8Array(buffer.slice(0));

  let doc;
  try {
    doc = await pdfjs.getDocument({ data: copia }).promise;
  } catch (e: unknown) {
    const nome = (e as { name?: string })?.name || "";
    if (nome === "PasswordException") {
      return {
        status: "bloqueado",
        motivoBloqueio: "PDF protegido por senha — o tablet não consegue abrir. Remova a senha.",
        avisos,
        thumbBlob: null,
      };
    }
    return {
      status: "bloqueado",
      motivoBloqueio: "Este PDF não abre (arquivo corrompido ou inválido).",
      avisos,
      thumbBlob: null,
    };
  }

  const paginas = doc.numPages;
  if (arquivo.size > LIMITE_PDF_MB * 1024 * 1024) {
    avisos.push(`PDF pesado (${fmtMB(arquivo.size)}) — vai demorar para baixar no tablet.`);
  }
  if (paginas > LIMITE_PDF_PAGINAS) {
    avisos.push(`${paginas} páginas — acima de ${LIMITE_PDF_PAGINAS}, navegação pode ficar pesada.`);
  }

  // Renderiza a página 1 (mede o tempo e aproveita para a thumb)
  let thumbBlob: Blob | null = null;
  try {
    const inicio = performance.now();
    const pagina = await doc.getPage(1);
    const viewportBase = pagina.getViewport({ scale: 1 });
    const escala = THUMB_LARGURA / viewportBase.width;
    const viewport = pagina.getViewport({ scale: escala });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      await pagina.render({ canvasContext: ctx, viewport }).promise;
      thumbBlob = await canvasParaPng(canvas);
    }
    const duracaoMs = performance.now() - inicio;
    if (duracaoMs > 3000) {
      avisos.push("Página 1 demorou para renderizar — vai ficar lento no tablet.");
    }
  } catch {
    avisos.push("Não foi possível renderizar a página 1 para a miniatura.");
  } finally {
    void doc.destroy();
  }

  return {
    status: avisos.length ? "aviso" : "ok",
    avisos,
    thumbBlob,
    paginas,
  };
}

// ---------------------------------------------------------------
// IMAGEM
// ---------------------------------------------------------------

export async function validarImagem(arquivo: File): Promise<ResultadoValidacao> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = async () => {
      const largura = img.naturalWidth;
      const altura = img.naturalHeight;
      const thumbBlob = await desenhaThumb(img, largura, altura);
      URL.revokeObjectURL(url);
      const avisos: string[] = [];
      if (arquivo.size > 10 * 1024 * 1024) {
        avisos.push(`Imagem pesada (${fmtMB(arquivo.size)}) — comprima antes de publicar.`);
      }
      resolve({
        status: avisos.length ? "aviso" : "ok",
        avisos,
        thumbBlob,
        largura,
        altura,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        status: "bloqueado",
        motivoBloqueio: "Esta imagem não abre no navegador (formato inválido ou corrompido).",
        avisos: [],
        thumbBlob: null,
      });
    };
    img.src = url;
  });
}
