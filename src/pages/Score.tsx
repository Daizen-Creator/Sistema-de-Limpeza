import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { computeScore, type ScoreResult } from "../lib/score";

export default function Score({ onNavigate }: { onNavigate: (p: any) => void }) {
  const [res, setRes] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(true);

  async function compute() {
    setLoading(true);
    const [system, hwR, smartR, drvR, bootR] = await Promise.all([
      api.systemInfo().catch(() => null),
      api.hwInfo().catch(() => ({ data: null })),
      api.diskSmart().catch(() => ({ data: [] })),
      api.driversList().catch(() => ({ data: [] })),
      api.bootList().catch(() => ({ data: [] })),
    ]);
    setRes(computeScore({
      system: system as any,
      hw: (hwR as any)?.data ?? null,
      smart: (smartR as any)?.data ?? [],
      drivers: (drvR as any)?.data ?? [],
      boot: (bootR as any)?.data ?? [],
    }));
    setLoading(false);
  }
  useEffect(() => { compute(); }, []);

  const total = res?.total ?? 0;
  const color = total >= 85 ? "#22ff77" : total >= 70 ? "#00e5ff" : total >= 50 ? "#ffd166" : "#ff5b5b";
  const circ = 2 * Math.PI * 80;
  const dash = (total / 100) * circ;

  return (
    <>
      <div className="page-head">
        <h2>Pontuacao do PC</h2>
        <p>Uma nota de 0 a 100 baseada em memoria, disco, saude do SSD, drivers e inicializacao.</p>
      </div>

      {loading ? (
        <div className="empty"><div className="spinner" style={{ margin: "0 auto 12px" }} /> Calculando a pontuacao…</div>
      ) : res && (
        <div className="score-wrap">
          <div className="score-gauge card">
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="80" fill="none" stroke="var(--bg-2)" strokeWidth="14" />
              <circle cx="100" cy="100" r="80" fill="none" stroke={color} strokeWidth="14"
                strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
                transform="rotate(-90 100 100)" style={{ transition: "stroke-dasharray .8s ease" }} />
              <text x="100" y="94" textAnchor="middle" fontSize="46" fontWeight="800" fill={color}>{total}</text>
              <text x="100" y="120" textAnchor="middle" fontSize="13" fill="var(--text-dim)">de 100</text>
            </svg>
            <div className="score-label" style={{ color }}>{res.label}</div>
            <button className="btn primary" style={{ marginTop: 10 }} onClick={() => onNavigate("optimize")}>⚡ Melhorar agora</button>
          </div>

          <div className="score-parts card">
            <div className="sec-h">Detalhamento</div>
            {res.parts.map((p) => {
              const c = p.score >= 70 ? "var(--accent)" : p.score >= 50 ? "var(--warn)" : "var(--danger)";
              return (
                <div className="score-part" key={p.name}>
                  <div className="sp-top">
                    <span className="sp-name">{p.name}</span>
                    <span className="sp-detail">{p.detail}</span>
                    <span className="sp-score" style={{ color: c }}>{p.score}</span>
                  </div>
                  <div className="progress"><div style={{ width: `${p.score}%`, background: c }} /></div>
                </div>
              );
            })}
            <button className="btn ghost" style={{ marginTop: 14 }} onClick={compute}>Recalcular</button>
          </div>
        </div>
      )}
    </>
  );
}
