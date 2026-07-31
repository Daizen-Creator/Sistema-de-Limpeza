import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { EventLog, HardwareInfo } from "../../electron/types";
import { formatBytes, pct } from "../lib/format";

export default function Alerts() {
  const [hw, setHw] = useState<HardwareInfo | null>(null);
  const [log, setLog] = useState<EventLog[]>([]);

  async function refresh() {
    api.hwInfo().then((r) => setHw(r.data)).catch(() => {});
    api.logList().then((r) => setLog(r.data ?? [])).catch(() => {});
  }
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  const ramFreePct = hw ? (hw.ramFreeBytes / hw.ramTotalBytes) * 100 : 100;
  const mainVol = hw?.volumes?.[0];
  const diskFreePct = mainVol ? (mainVol.freeBytes / mainVol.totalBytes) * 100 : 100;
  const temp = hw?.cpuTempC ?? null;

  const alerts = [
    {
      icon: "🌡️", label: "Temperatura da CPU", limit: "> 85°C",
      value: temp != null ? `${temp}°C` : "n/d",
      danger: temp != null && temp > 85,
      pctv: temp != null ? Math.min(100, (temp / 100) * 100) : 0,
    },
    {
      icon: "📊", label: "Memória RAM livre", limit: "< 10%",
      value: `${ramFreePct.toFixed(0)}%`,
      danger: ramFreePct < 10,
      pctv: 100 - ramFreePct,
    },
    {
      icon: "💽", label: `Disco livre (${mainVol?.drive ?? "C:"})`, limit: "< 5%",
      value: `${diskFreePct.toFixed(0)}%`,
      danger: diskFreePct < 5,
      pctv: 100 - diskFreePct,
    },
  ];

  return (
    <>
      <div className="page-head">
        <h2>Alertas & Log</h2>
        <p>Monitoramento continuo. Voce recebe uma notificacao do Windows se algo passar do limite.</p>
      </div>

      <div className="grid cols-3">
        {alerts.map((a) => (
          <div className={`card alert-card ${a.danger ? "danger" : "ok"}`} key={a.label}>
            <div className="alert-top">
              <span className="alert-ico">{a.icon}</span>
              <span className={`pill ${a.danger ? "off" : "on"}`}>{a.danger ? "ALERTA" : "OK"}</span>
            </div>
            <div className="alert-value">{a.value}</div>
            <div className="alert-label">{a.label}</div>
            <div className="alert-limit">Limite: {a.limit}</div>
            <div className="progress"><div style={{ width: `${a.pctv}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="sec-top">
          <div>
            <div className="sec-h">📜 Log de eventos</div>
            <div className="sec-d">Historico das otimizacoes e acoes executadas.</div>
          </div>
          <button className="btn ghost" onClick={() => api.logClear().then(refresh)}>Limpar log</button>
        </div>
        <div className="log-list">
          {log.length === 0 && <div className="empty">Nenhum evento registrado ainda.</div>}
          {log.map((e, i) => (
            <div className="log-row" key={i}>
              <span className="log-time">{new Date(e.time).toLocaleString("pt-BR")}</span>
              <span className="log-type">{e.type}</span>
              <span className="log-detail">{e.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
