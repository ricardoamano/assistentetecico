import { idbGet, idbSet, K } from './idb';

/** device_id: UUID gerado no primeiro boot e persistido no IndexedDB. */
export async function obterDeviceId(): Promise<string> {
  let id = await idbGet<string>(K.DEVICE_ID);
  if (!id) {
    id =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await idbSet(K.DEVICE_ID, id);
  }
  return id;
}

/** Nível de bateria 0–100, se a API existir. */
export async function obterBateria(): Promise<number | null> {
  try {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number }>;
    };
    if (typeof nav.getBattery === 'function') {
      const b = await nav.getBattery();
      return Math.round(b.level * 100);
    }
  } catch {
    /* API opcional: falha silenciosa */
  }
  return null;
}

/** Memória do aparelho em MB (navigator.deviceMemory vem em GB). */
export function obterMemoriaMb(): number | null {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return typeof nav.deviceMemory === 'number' ? Math.round(nav.deviceMemory * 1024) : null;
}

/** Pede armazenamento persistente na 1ª execução (dentro de if, log se negado). */
export async function pedirStoragePersistente(): Promise<void> {
  if (navigator.storage && typeof navigator.storage.persist === 'function') {
    try {
      const ok = await navigator.storage.persist();
      if (!ok) console.warn('[kiosk] storage.persist() negado pelo navegador');
    } catch {
      /* silencioso */
    }
  }
}

export async function estimarEspaco(): Promise<{ usadoMb: number; livreMb: number } | null> {
  if (navigator.storage && typeof navigator.storage.estimate === 'function') {
    try {
      const est = await navigator.storage.estimate();
      const usado = est.usage ?? 0;
      const quota = est.quota ?? 0;
      return {
        usadoMb: Math.round(usado / 1024 / 1024),
        livreMb: Math.round((quota - usado) / 1024 / 1024),
      };
    } catch {
      /* silencioso */
    }
  }
  return null;
}

/** Trava a orientação em retrato quando o navegador deixa. */
export function travarRetrato(): void {
  try {
    const orient = screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>;
    };
    if (orient && typeof orient.lock === 'function') {
      orient.lock('portrait').catch(() => {});
    }
  } catch {
    /* fallback: o layout já é sempre retrato via CSS */
  }
}

/** Wake lock com reaquisição no visibilitychange. */
export function manterTelaAcordada(): void {
  type WakeLockSentinel = { release: () => Promise<void> };
  type NavWakeLock = Navigator & {
    wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinel> };
  };
  const nav = navigator as NavWakeLock;
  if (!nav.wakeLock) return;

  let sentinel: WakeLockSentinel | null = null;
  const adquirir = async () => {
    try {
      sentinel = await nav.wakeLock!.request('screen');
    } catch {
      sentinel = null;
    }
  };
  void adquirir();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !sentinel) void adquirir();
    if (document.visibilityState === 'hidden') sentinel = null;
  });
}
