import { useState } from "react";
import { api } from "../lib/api";
import { usePoll } from "../lib/usePoll";
import type { SensorData } from "../../electron/types";

export default function Sensors() {
  const [d, setD] = useState<SensorData | null>(null);

  usePoll(async () => {
    const r = await api.sensors();
    if (r.data) setD(r.data);
  }, 2500);

  const loadColor = (l: number) => (l >= 80 ? "var(--danger)" : l >= 50 ? "var(--warn)" : "var(--accent)");

  return (
    <>
      <div className="page-head">
        <h2>Sensores</h2>
        <p>Monitoramento do processador em tempo real. Atualiza a cada 2 segundos.</p>
      </div>

      {!d ? (
        <div className="empty"><div className="spinner" style={{ margin: "0 auto 12px" }} /> Lendo sensores…</div>
      ) : (
        <>
          <div className="grid cols-3">
            <div className="card"><h3>CLOCK ATUAL</h3><div className="metric">{(d.cpuClock / 1000).toFixed(2)} <span style={{ fontSize: 14 }}>GHz</span></div><div className="sub">max {(d.cpuMaxClock / 1000).toFixed(1)} GHz</div></div>
            <div className="card"><h3>USO TOTAL</h3><div className="metric" style={{ color: loadColor(d.cpuLoad) }}>{d.cpuLoad}%</div><div className="sub">{d.cores.length} threads</div></div>
            <div className="card"><h3>VOLTAGEM · TEMP</h3><div className="metric" style={{ fontSize: 22 }}>{d.voltage >= 0 ? `${d.voltage} V` : "n/d"}{d.tempC >= 0 ? ` · ${d.tempC}°C` : ""}</div><div className="sub">{d.voltage < 0 && d.tempC < 0 ? "requer LibreHardwareMonitor" : "via WMI"}</div></div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="sec-h" title={d.cpuName}>🧠 Uso por nucleo — {d.cpuName}</div>
            <div className="cores-grid">
              {d.cores.map((c) => (
                <div className="core" key={c.core}>
                  <div className="core-top">
                    <span>Nucleo {c.core}</span>
                    <span style={{ color: loadColor(c.load), fontWeight: 700 }}>{c.load}%</span>
                  </div>
                  <div className="core-bar"><div style={{ height: `${c.load}%`, background: loadColor(c.load) }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="sec-h">🌀 Ventoinhas</div>
            {d.fans.length ? (
              <div className="svc-list" style={{ marginTop: 8 }}>
                {d.fans.map((f, i) => (
                  <div className="svc-row" key={i}>
                    <span className="svc-name">{f.name}</span>
                    <span className="pill on">{f.speed > 0 ? `${f.speed} RPM` : "ativa"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="hint warn" style={{ marginTop: 8 }}>
                Nenhuma ventoinha detectada pelo Windows. <b>RPM de ventoinha e voltagem detalhada</b> normalmente
                exigem o <b>LibreHardwareMonitor</b> (aplicativo gratuito). Com ele aberto em segundo plano,
                os sensores completos ficam disponiveis.
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
