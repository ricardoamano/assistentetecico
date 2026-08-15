"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { formatBytes, minutosDesde, tempoRelativo } from "@/lib/format";
import type { AppConfig, Device } from "@/lib/types";

type Semaforo = "verde" | "amarelo" | "vermelho";

function calculaSemaforo(d: Device, versaoPublicada: number): Semaforo {
  const minutos = minutosDesde(d.online_em);
  if (minutos > 30 || (d.erros_24h ?? 0) > 3) return "vermelho";
  if ((d.versao_baixada ?? 0) > (d.versao_ativa ?? 0)) return "amarelo";
  if (d.versao_ativa === versaoPublicada && minutos < 30) return "verde";
  return "amarelo";
}

const SEMAFORO_INFO: Record<Semaforo, { emoji: string; titulo: string }> = {
  verde: { emoji: "🟢", titulo: "Atualizado e em contato" },
  amarelo: { emoji: "🟡", titulo: "Baixando ou desatualizado" },
  vermelho: { emoji: "🔴", titulo: "Sem contato há mais de 30 min ou com erros" },
};

function ApelidoEditavel({
  device,
  onSalvo,
}: {
  device: Device;
  onSalvo: (novo: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(device.apelido ?? "");

  async function salva() {
    setEditando(false);
    const novo = valor.trim();
    if (novo === (device.apelido ?? "")) return;
    const { error } = await getSupabase()
      .from("devices")
      .update({ apelido: novo || null })
      .eq("device_id", device.device_id);
    if (!error) onSalvo(novo);
  }

  if (editando) {
    return (
      <input
        autoFocus
        className="input !w-36 !px-2 !py-1 text-sm"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={salva}
        onKeyDown={(e) => {
          if (e.key === "Enter") salva();
          if (e.key === "Escape") {
            setValor(device.apelido ?? "");
            setEditando(false);
          }
        }}
      />
    );
  }
  return (
    <button
      className="rounded px-1 py-0.5 text-left font-medium text-slate-800 hover:bg-slate-100"
      onClick={() => setEditando(true)}
      title="Clique para renomear"
    >
      {device.apelido || <span className="italic text-slate-400">sem apelido</span>} ✎
    </button>
  );
}

export default function DispositivosPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [versaoPublicada, setVersaoPublicada] = useState<number>(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carrega = useCallback(async () => {
    const supabase = getSupabase();
    const [devRes, cfgRes] = await Promise.all([
      supabase.from("devices").select("*").order("apelido", { ascending: true }),
      supabase.from("app_config").select("versao_publicada").eq("id", 1).single(),
    ]);
    if (devRes.error) {
      setErro(`Não foi possível carregar os dispositivos: ${devRes.error.message}`);
    } else {
      setErro(null);
      setDevices((devRes.data as Device[]) ?? []);
    }
    if (!cfgRes.error) {
      setVersaoPublicada((cfgRes.data as Pick<AppConfig, "versao_publicada">).versao_publicada);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carrega();
    const timer = setInterval(() => void carrega(), 60_000); // atualiza a cada minuto
    return () => clearInterval(timer);
  }, [carrega]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dispositivos</h1>
          <p className="text-sm text-slate-500">
            Versão publicada: <strong>{versaoPublicada}</strong> · a lista atualiza a cada minuto.
          </p>
        </div>
        <button className="btn-secondary" onClick={() => void carrega()}>
          Atualizar agora
        </button>
      </div>

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : devices.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">
          Nenhum tablet apareceu ainda. Assim que um tablet fizer o primeiro contato, ele entra
          nesta lista.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5">Apelido</th>
                <th className="px-3 py-2.5">Device ID</th>
                <th className="px-3 py-2.5">Versão (ativa / baixada)</th>
                <th className="px-3 py-2.5">Último contato</th>
                <th className="px-3 py-2.5">Bateria</th>
                <th className="px-3 py-2.5">Memória</th>
                <th className="px-3 py-2.5">Erros 24 h</th>
                <th className="px-3 py-2.5">Último erro</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => {
                const s = calculaSemaforo(d, versaoPublicada);
                const info = SEMAFORO_INFO[s];
                return (
                  <tr key={d.device_id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2.5" title={info.titulo}>
                      <span className="text-base">{info.emoji}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <ApelidoEditavel
                        device={d}
                        onSalvo={(novo) =>
                          setDevices((atual) =>
                            atual.map((x) =>
                              x.device_id === d.device_id ? { ...x, apelido: novo || null } : x
                            )
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{d.device_id}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={
                          d.versao_ativa === versaoPublicada
                            ? "font-semibold text-emerald-700"
                            : "font-semibold text-amber-700"
                        }
                      >
                        v{d.versao_ativa ?? "—"}
                      </span>{" "}
                      <span className="text-slate-400">/ v{d.versao_baixada ?? "—"}</span>
                      {(d.versao_baixada ?? 0) > (d.versao_ativa ?? 0) && (
                        <span className="ml-1 text-xs text-slate-400">
                          ({formatBytes(d.bytes_baixados)} baixados)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{tempoRelativo(d.online_em)}</td>
                    <td className="px-3 py-2.5">
                      {d.bateria != null ? (
                        <span className={d.bateria < 20 ? "font-semibold text-red-600" : ""}>
                          {d.bateria}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {d.memoria_mb != null ? `${d.memoria_mb} MB` : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={
                          (d.erros_24h ?? 0) > 3 ? "font-semibold text-red-600" : "text-slate-600"
                        }
                      >
                        {d.erros_24h ?? 0}
                      </span>
                    </td>
                    <td
                      className="max-w-[220px] truncate px-3 py-2.5 text-xs text-slate-500"
                      title={d.ultimo_erro ?? undefined}
                    >
                      {d.ultimo_erro ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">
        🟢 na versão publicada e contato há menos de 30 min · 🟡 baixando ou desatualizado · 🔴 sem
        contato há mais de 30 min ou mais de 3 erros em 24 h.
      </p>
    </div>
  );
}
