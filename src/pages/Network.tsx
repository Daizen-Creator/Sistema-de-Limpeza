import { useState } from "react";
import { api } from "../lib/api";
import { usePoll } from "../lib/usePoll";
import type { NetProc, PingResult } from "../../electron/types";
import MatrixConsole from "../components/MatrixConsole";

export default function Network() {
  const [procs, setProcs] = useState<NetProc[]>([]);
  const [host, setHost] = useState("google.com");
  const [ping, setPing] = useState<PingResult | null>(null);
  const [pinging, setPinging] = useState(false);
  const [trace, setTrace] = useState(false);
  const [auto, setAuto] = useState(true);

  async function loadProcs() {
    const r = await api.netProcesses();
    setProcs(r.data ?? []);
  }
  usePoll(async () => {
    if (auto) await loadProcs();
  }, 4500, [auto]);

  const cleanHost = () => host.trim().replace(/[^A-Za-z0-9.\-]/g, "");

  async function doPing() {
    const h = cleanHost();
    if (!h) return;
    setPinging(true); setPing(null);
    const r = await api.netPing(h, 4);
    setPing(r.data ?? null);
    setPinging(false);
  }

  const maxConn = procs[0]?.connections || 1;

  return (
    <>
      <div className="page-head">
        <h2>Rede</h2>
        <p>Veja quais apps estao usando a internet e faca diagnosticos de conexao.</p>
      </div>

      {/* Diagnostico */}
      <div className="card">
        <div className="sec-h">🛰️ Diagnostico de rede</div>
        <div className="net-diag">
          <input className="search" value={host} onChange={(e) => setHost(e.target.value)}
                 placeholder="host ou IP (ex: google.com)" />
          <button className="btn primary" onClick={doPing} disabled={pinging}>
            {pinging ? <><span className="spinner" /> Pingando…</> : "Ping"}
          </button>
          <button className="btn ghost" onClick={() => setTrace(true)}>Traceroute</button>
        </div>
        {ping && (
          <div className="ping-grid">
            <PingStat k="Enviados" v={`${ping.sent}`} />
            <PingStat k="Recebidos" v={`${ping.received}`} />
            <PingStat k="Perda" v={`${ping.lossPct}%`} danger={ping.lossPct > 0} />
            <PingStat k="Min" v={ping.minMs >= 0 ? `${ping.minMs} ms` : "—"} />
            <PingStat k="Media" v={ping.avgMs >= 0 ? `${ping.avgMs} ms` : "—"} accent />
            <PingStat k="Max" v={ping.maxMs >= 0 ? `${ping.maxMs} ms` : "—"} />
          </div>
        )}
      </div>

      {/* Uso por processo */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="sec-top">
          <div>
            <div className="sec-h">📡 Apps usando a rede</div>
            <div className="sec-d">Ordenado por conexoes ativas ({procs.length} apps).</div>
          </div>
          <label className="auto-toggle">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> auto
          </label>
        </div>
        <div className="tree-list" style={{ marginTop: 8 }}>
          {procs.map((p) => (
            <div className="net-row" key={p.pid}>
              <span className="net-name">{p.name} <span className="net-pid">#{p.pid}</span></span>
              <div className="tree-bar"><div style={{ width: `${(p.connections / maxConn) * 100}%` }} /></div>
              <span className="net-conn">{p.connections} conexoes</span>
              <span className="net-remotes" title={p.remotes}>{p.remotes}</span>
            </div>
          ))}
          {procs.length === 0 && <div className="empty">Nenhuma conexao ativa no momento.</div>}
        </div>
      </div>

      {trace && (
        <MatrixConsole
          kind="trace"
          title={`SYSTEM :: TRACEROUTE ${cleanHost()}`}
          actions={cleanHost()}
          onClose={() => setTrace(false)}
        />
      )}
    </>
  );
}

function PingStat({ k, v, accent, danger }: { k: string; v: string; accent?: boolean; danger?: boolean }) {
  return (
    <div className="ping-stat">
      <span className="ping-k">{k}</span>
      <span className="ping-v" style={{ color: danger ? "var(--danger)" : accent ? "var(--accent)" : undefined }}>{v}</span>
    </div>
  );
}
