import { getSupabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase";

/**
 * Upload para o bucket `conteudo` com progresso real via XHR
 * (o supabase-js não expõe progresso de upload).
 */
export async function uploadComProgresso(
  path: string,
  data: Blob,
  contentType: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/conteudo/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("Cache-Control", "max-age=31536000");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        let msg = `Falha no upload (HTTP ${xhr.status}).`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body?.message) msg = `Falha no upload: ${body.message}`;
        } catch {
          /* mantém msg padrão */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Falha de rede durante o upload."));
    xhr.send(data);
  });
}
