import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { usePoll } from "../lib/usePoll";
import type { SystemInfo, HardwareInfo, NetStats } from "../../electron/types";
import { formatBytes, pct } from "../lib/format";

export default function Dashboard({
  info,
  onNavigate,
}: {
  info: SystemInfo | null;
  onNavigate: (p: any) => void;
}) {
  const [hw, setHw] = useState<HardwareInfo | null>(null);
  const [net, setNet] = useState<{ down: number; up: number; ping: number } | null>(null);
  const lastNet = useRef<{ rx: number; tx: number; t: number } | null>(null);

  useEffect(() => {
    api.hwInfo().then((r) => setHw(r.data)).catch(() => {});
  }, []);

  usePoll(async () => {
    const r = await api.netStats();
    const now = Date.now();
    const s: NetStats = r.data;
    if (lastNet.current) {
      const dt = (now - lastNet.current.t) / 1000;
      const down = ((s.rxBytes - lastNet.current.rx) * 8) / 1e6 / dt; // Mbps
      const up = ((s.txBytes - lastNet.current.tx) * 8) / 1e6 / dt;
      setNet({ down: Math.max(0, down), up: Math.max(0, up), ping: s.pingGoogle });
    }
    lastNet.current = { rx: s.rxBytes, tx: s.txBytes, t: now };
  }, 2000);

  const ramUsed = hw ? hw.ramTotalBytes - hw.ramFreeBytes : 0;

  return (
    <>
      <div className="page-head">
        <h2>Painel</h2>
        <p>Monitoramento do seu hardware em tempo real. Tudo roda localmente.</p>
      </div>

      {/* Hardware */}
      <div className="grid cols-2">
        <div className="card hw">
          <div className="hw-ico">🧠</div>
          <div className="hw-body">
            <h3>PROCESSADOR</h3>
            <div className="hw-name">{hw?.cpuName ?? "…"}</div>
            <div className="hw-meta">
              {hw ? `${hw.cpuCores} nucleos · ${hw.cpuThreads} threads · ${(hw.cpuClockMhz / 1000).toFixed(1)} GHz` : ""}
              {hw?.cpuTempC != null ? ` · ${hw.cpuTempC}°C` : ""}
            </div>
            <div className="progress"><div style={{ width: `${hw?.cpuLoad ?? 0}%` }} /></div>
            <div className="hw-sub">{hw ? `Uso: ${hw.cpuLoad}%` : ""}</div>
          </div>
        </div>

        <div className="card hw">
          <div className="hw-ico">🎮</div>
          <div className="hw-body">
            <h3>PLACA DE VIDEO</h3>
            <div className="hw-name">{hw?.gpuName ?? "…"}</div>
            <div className="hw-meta">
              {hw ? `Driver ${hw.gpuDriver}` : ""}
              {hw && hw.gpuVramBytes > 0 ? ` · ${formatBytes(hw.gpuVramBytes)} VRAM` : ""}
            </div>
          </div>
        </div>

        <div className="card hw">
          <div className="hw-ico">📊</div>
          <div className="hw-body">
            <h3>MEMORIA RAM</h3>
            <div className="hw-name">
              {hw ? `${formatBytes(ramUsed)} / ${formatBytes(hw.ramTotalBytes)}` : "…"}
            </div>
            <div className="progress"><div style={{ width: `${hw ? pct(ramUsed, hw.ramTotalBytes) : 0}%` }} /></div>
            <div className="hw-sub">{hw ? `${formatBytes(hw.ramFreeBytes)} livres` : ""}</div>
          </div>
        </div>

        <div className="card hw">
          <div className="hw-ico">🌐</div>
          <div className="hw-body">
            <h3>REDE</h3>
            <div className="net-row">
              <span className="net-down">↓ {net ? net.down.toFixed(1) : "0.0"} <b>Mbps</b></span>
              <span className="net-up">↑ {net ? net.up.toFixed(1) : "0.0"} <b>Mbps</b></span>
            </div>
            <div className="hw-sub">Ping Google: {net ? `${net.ping} ms` : "…"}</div>
          </div>
        </div>
      </div>

      {/* Discos separados por tipo */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3>ARMAZENAMENTO</h3>
        <div className="disks">
          {hw?.disks.map((d, i) => (
            <div className="disk" key={i}>
              <span className={`disk-badge ${d.media === "SSD" ? "ssd" : "hdd"}`}>
                {d.media === "SSD" ? "SSD" : d.media === "HDD" ? "HD" : "DISCO"}
              </span>
              <span className="disk-name">{d.name}</span>
              <span className="disk-size">{formatBytes(d.sizeBytes)}</span>
            </div>
          ))}
          <div className="vol-divider" />
          {hw?.volumes.map((v, i) => {
            const used = v.totalBytes - v.freeBytes;
            return (
              <div className="vol" key={i}>
                <div className="vol-head">
                  <span className="vol-drive">{v.drive}</span>
                  <span className="vol-nums">
                    {formatBytes(v.freeBytes)} livres de {formatBytes(v.totalBytes)}
                  </span>
                </div>
                <div className="progress"><div style={{ width: `${pct(used, v.totalBytes)}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Atalhos */}
      <div className="grid cols-3" style={{ marginTop: 16 }}>
        <ShortcutCard title="Turbo FPS" desc="Otimize para jogos" btn="Ativar" onClick={() => onNavigate("optimize")} />
        <ShortcutCard title="Limpeza" desc="Libere espaco em disco" btn="Limpar" onClick={() => onNavigate("cleaner")} />
        <ShortcutCard title="Drivers" desc="Atualize com seguranca" btn="Verificar" onClick={() => onNavigate("drivers")} />
      </div>
    </>
  );
}

function ShortcutCard({ title, desc, btn, onClick }: { title: string; desc: string; btn: string; onClick: () => void }) {
  return (
    <div className="card">
      <h3>{title.toUpperCase()}</h3>
      <div className="sub" style={{ marginBottom: 12 }}>{desc}</div>
      <button className="btn primary" onClick={onClick}>{btn}</button>
    </div>
  );
}
