import { useState } from "react";
import { api } from "../lib/api";
import { usePoll } from "../lib/usePoll";
import type { ProcInfo } from "../../electron/types";

const LEVELS = [
  { id: "low", label: "Baixa" },
  { id: "belownormal", label: "Abaixo" },
  { id: "normal", label: "Normal" },
  { id: "abovenormal", label: "Acima" },
  { id: "high", label: "Alta" },
  { id: "realtime", label: "Tempo Real" },
];

export default function Processes() {
  const [procs, setProcs] = useState<ProcInfo[]>([]);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);

  async function load() {
    const r = await api.procList();
    setProcs(r.data ?? []);
    setLoading(false);
  }

  usePoll(async () => {
    if (auto) await load();
  }, 3500, [auto]);

  async function kill(p: ProcInfo) {
    if (!confirm(`Encerrar "${p.name}" (PID ${p.pid})?\n\nProcessos do sistema podem causar instabilidade.`)) return;
    const r = await api.procKill(p.pid);
    setMsg(r.ok ? `✓ ${p.name} encerrado.` : `Falha: ${r.message ?? "erro"}`);
    load();
  }

  async function setPrio(p: ProcInfo, level: string) {
    const r = await api.procPriority(p.pid, level);
    setMsg(r.ok ? `✓ Prioridade de ${p.name}: ${level}` : `Falha: ${r.message ?? "erro"}`);
  }

  const shown = procs.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()));
  const totalRam = procs.reduce((a, b) => a + b.ramMB, 0);

  return (
    <>
      <div className="page-head">
        <h2>Processos — Gerenciador Pro</h2>
        <p>Processos ativos por consumo de memoria. Encerre travados ou ajuste a prioridade.</p>
      </div>

      <div className="actions" style={{ marginTop: 0, marginBottom: 14 }}>
        <input
          className="search"
          placeholder="Filtrar por nome…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <span className="proc-stat">{procs.length} processos · {(totalRam / 1024).toFixed(1)} GB</span>
        <label className="auto-toggle">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> auto
        </label>
        <button className="btn ghost" onClick={load}>Atualizar</button>
      </div>

      {msg && <div className="hint" style={{ marginBottom: 12 }}>{msg}</div>}

      {loading ? (
        <div className="empty"><div className="spinner" style={{ margin: "0 auto 12px" }} /> Lendo processos…</div>
      ) : (
        <div className="proc-table">
          <div className="proc-head">
            <span className="c-name">PROCESSO</span>
            <span className="c-pid">PID</span>
            <span className="c-ram">RAM</span>
            <span className="c-cpu">CPU (s)</span>
            <span className="c-act">ACOES</span>
          </div>
          {shown.map((p) => (
            <div className="proc-row" key={p.pid}>
              <span className="c-name" title={p.name}>{p.name}</span>
              <span className="c-pid">{p.pid}</span>
              <span className="c-ram">{p.ramMB.toFixed(0)} MB</span>
              <span className="c-cpu">{p.cpuSec}</span>
              <span className="c-act">
                <select
                  className="prio-select"
                  defaultValue="normal"
                  onChange={(e) => setPrio(p, e.target.value)}
                  title="Prioridade"
                >
                  {LEVELS.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
                <button className="btn-kill" onClick={() => kill(p)}>Matar</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
