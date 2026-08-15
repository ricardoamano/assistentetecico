import type { Manifest } from '../types';
import { MANIFEST_URL } from '../config';
import { idbGet, idbSet, idbDel, K } from './idb';
import { fetchSimples } from './fetchTimeout';
import { baixarVersao, podarCaches } from './downloader';
import { getEstado, setEstado } from './store';
import { registrarErro } from './erros';
import { enviarHeartbeat } from './heartbeat';

/** Carrega ATIVO e STAGED do IndexedDB para o estado (zero rede). */
export async function carregarManifestsLocais(): Promise<void> {
  const [ativo, staged] = await Promise.all([
    idbGet<Manifest>(K.MANIFEST_ATIVO),
    idbGet<Manifest>(K.MANIFEST_STAGED),
  ]);
  setEstado({ ativo: ativo ?? null, staged: staged ?? null });
}

/**
 * Busca /manifest com ETag (If-None-Match).
 * Em 304, devolve a última cópia remota guardada no IndexedDB — assim um
 * download abortado ainda é retentado no próximo poll mesmo sem mudança
 * de ETag. Retorna null só em falha de rede sem cópia local.
 */
export async function buscarManifestRemoto(): Promise<Manifest | null> {
  try {
    const etag = await idbGet<string>(K.MANIFEST_ETAG);
    const headers: Record<string, string> = {};
    if (etag) headers['If-None-Match'] = etag;
    const res = await fetchSimples(MANIFEST_URL, { headers });
    if (res.status === 304) {
      return (await idbGet<Manifest>(K.MANIFEST_REMOTO)) ?? null;
    }
    if (!res.ok) throw new Error(`manifest HTTP ${res.status}`);
    const json = (await res.json()) as Manifest;
    if (typeof json.versao !== 'number' || !Array.isArray(json.itens)) {
      throw new Error('manifest inválido');
    }
    const novoEtag = res.headers.get('ETag');
    if (novoEtag) await idbSet(K.MANIFEST_ETAG, novoEtag);
    await idbSet(K.MANIFEST_REMOTO, json);
    return json;
  } catch {
    return null; // offline ou erro: segue com o que está no cache
  }
}

let verificando = false;

/**
 * Fluxo de verificação: se manifest.versao > ATIVA e ainda não staged,
 * baixa em segundo plano para conteudo-v{nova} e grava STAGED.
 * Nunca mexe na ATIVA — aplicar é outra etapa (aplicarStaged).
 */
export async function verificarAtualizacao(): Promise<void> {
  if (verificando || getEstado().download.emAndamento) return;
  verificando = true;
  try {
    const remoto = await buscarManifestRemoto();
    if (!remoto) return;

    const { ativo, staged } = getEstado();
    if (!ativo) return; // 1ª execução é conduzida pela tela Preparar

    if (remoto.versao > ativo.versao && staged?.versao !== remoto.versao) {
      try {
        await baixarVersao(remoto, staged ?? ativo);
        await idbSet(K.MANIFEST_STAGED, remoto);
        setEstado({ staged: remoto });
      } catch {
        // abortado: mantém a ATIVA (erro já registrado pelo downloader)
      }
    } else if (remoto.versao === ativo.versao) {
      // Mesma versão: atualiza config/textos sem redownload
      await idbSet(K.MANIFEST_ATIVO, remoto);
      setEstado({ ativo: remoto });
    }
  } finally {
    verificando = false;
  }
}

/**
 * Aplica a STAGED (ATIVA ← STAGED), poda caches antigos (mantém no máximo 2:
 * atual + anterior) e envia heartbeat. Chamar SOMENTE na home.
 */
export async function aplicarStaged(): Promise<boolean> {
  const { staged, ativo } = getEstado();
  if (!staged) return false;
  try {
    await idbSet(K.MANIFEST_ATIVO, staged);
    await idbDel(K.MANIFEST_STAGED);
    const manter = [staged.versao];
    if (ativo) manter.push(ativo.versao);
    await podarCaches(manter);
    setEstado({ ativo: staged, staged: null });
    void enviarHeartbeat();
    return true;
  } catch (err) {
    void registrarErro(`aplicarStaged: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

/**
 * 1ª execução / "Baixar tudo": busca o manifest, baixa tudo e ativa direto
 * (não há ATIVA anterior a preservar) OU deixa como staged se já houver ativa.
 */
export async function baixarTudoEAtivar(): Promise<void> {
  const remoto = await buscarManifestRemoto();
  const { ativo } = getEstado();
  const alvo = remoto ?? ativo;
  if (!alvo) throw new Error('Sem conexão e sem conteúdo baixado.');

  await baixarVersao(alvo, ativo);
  if (!ativo || alvo.versao === ativo.versao) {
    await idbSet(K.MANIFEST_ATIVO, alvo);
    await idbDel(K.MANIFEST_STAGED);
    await podarCaches([alvo.versao]);
    setEstado({ ativo: alvo, staged: null });
  } else {
    await idbSet(K.MANIFEST_STAGED, alvo);
    setEstado({ staged: alvo });
  }
  void enviarHeartbeat();
}

/** "Limpar cache e rebaixar tudo" do menu de manutenção. */
export async function limparERebaixar(): Promise<void> {
  await podarCaches([]); // apaga todos os conteudo-v*
  await idbDel(K.MANIFEST_STAGED);
  await idbDel(K.MANIFEST_ETAG);
  await idbDel(K.MANIFEST_REMOTO);
  setEstado({ staged: null });
  await baixarTudoEAtivar();
}
