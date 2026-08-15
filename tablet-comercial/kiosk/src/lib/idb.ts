/**
 * Wrapper promise mínimo sobre IndexedDB, feito à mão.
 * Um único object store chave-valor ("kv") guarda metadados:
 * manifest ATIVO, manifest STAGED, device_id, timestamps do watchdog, erros.
 */

const DB_NAME = 'kiosk-db';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Se outra aba/versão pedir upgrade, fecha para não travar.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB bloqueado'));
  });
  return dbPromise;
}

export async function idbGet<T>(chave: string): Promise<T | undefined> {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(chave);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet(chave: string, valor: unknown): Promise<void> {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(valor, chave);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDel(chave: string): Promise<void> {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(chave);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Chaves conhecidas
export const K = {
  MANIFEST_ATIVO: 'manifest_ativo',
  MANIFEST_STAGED: 'manifest_staged',
  MANIFEST_ETAG: 'manifest_etag',
  MANIFEST_REMOTO: 'manifest_remoto',
  DEVICE_ID: 'device_id',
  WATCHDOG_TS: 'watchdog_ts',
  ULTIMO_ERRO: 'ultimo_erro',
  ERROS_TIMESTAMPS: 'erros_timestamps',
  PRIMEIRA_EXECUCAO_OK: 'primeira_execucao_ok',
} as const;
