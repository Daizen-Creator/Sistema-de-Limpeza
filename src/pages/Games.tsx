import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { HardwareInfo } from "../../electron/types";
import { GAMES, gpuScore, estimate } from "../lib/games";
import { formatBytes } from "../lib/format";

export default function Games() {
  const [hw, setHw] = useState<HardwareInfo | null>(null);
  const [phase, setPhase] = useState<"detecting" | "done">("detecting");

  // PASSO 1 — identificar o hardware real da maquina
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.hwInfo();
        if (alive && r.ok && r.data) {
          setHw(r.data);
          setPhase("done");
        }
      } catch {
        if (alive) setPhase("done");
      }
    })();
    return () => { alive = false; };
  }, []);

  const gpu = useMemo(() => gpuScore(hw?.gpuName), [hw?.gpuName]);
  const ramGB = hw ? hw.ramTotalBytes / 1024 ** 3 : 0;

  // armazenamento detectado (prioriza SSD)
  const ssd = hw?.disks?.find((d) => d.media === "SSD");
  const anyDisk = hw?.disks?.[0];
  const storage = ssd ?? anyDisk;

  // PASSO 2 — comparar com os jogos (so depois da deteccao)
  const results = useMemo(
    () =>
      hw
        ? GAMES.map((g) => ({ game: g, res: estimate(g, gpu.score, ramGB) }))
            .sort((a, b) => b.res.fps - a.res.fps)
        : [],
    [hw, gpu.score, ramGB]
  );
  const runnable = results.filter((r) => r.res.verdict !== "no").length;

  // --- tela de deteccao ---
  if (phase === "detecting" || !hw) {
    return (
      <>
        <div className="page-head">
          <h2>Meu PC roda? — Jogos</h2>
          <p>Primeiro identificamos o seu hardware; depois comparamos com os jogos.</p>
        </div>
        <div className="detect-box">
          <div className="spinner" style={{ width: 26, height: 26 }} />
          <div className="detect-txt">
            <b>Identificando hardware…</b>
            <span>Lendo processador, placa de vídeo, memória e disco</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <h2>Meu PC roda? — Jogos</h2>
        <p>
          Hardware identificado abaixo. Os FPS são <strong>estimativas</strong> em 1080p e variam
          com as configurações do jogo.
        </p>
      </div>

      {/* PASSO 1: hardware detectado */}
      <div className="card detected">
        <div className="detected-h">✓ Hardware detectado</div>
        <div className="detected-grid">
          <div className="det-item">
            <span className="det-k">🎮 Placa de vídeo</span>
            <span className="det-v">{hw.gpuName}</span>
            <span className="det-s">
              índice {gpu.score}{!gpu.known ? " · estimado" : ""}
              {hw.gpuVramBytes > 0 ? ` · ${formatBytes(hw.gpuVramBytes)}` : ""}
            </span>
          </div>
          <div className="det-item">
            <span className="det-k">🧠 Processador</span>
            <span className="det-v">{hw.cpuName}</span>
            <span className="det-s">{hw.cpuCores} núcleos · {hw.cpuThreads} threads</span>
          </div>
          <div className="det-item">
            <span className="det-k">📊 Memória RAM</span>
            <span className="det-v">{ramGB.toFixed(0)} GB</span>
            <span className="det-s">{formatBytes(hw.ramFreeBytes)} livres agora</span>
          </div>
          <div className="det-item">
            <span className="det-k">💽 Armazenamento</span>
            <span className="det-v">{storage ? storage.name : "—"}</span>
            <span className="det-s">
              {storage ? `${storage.media === "SSD" ? "SSD" : "HD"} · ${formatBytes(storage.sizeBytes)}` : ""}
            </span>
          </div>
        </div>
        <div className="detected-sum">
          Resultado: <b>{runnable}</b> de {GAMES.length} jogos rodam neste PC.
        </div>
      </div>

      {/* PASSO 2: comparacao com jogos */}
      <div className="grid cols-3" style={{ marginTop: 16 }}>
        {results.map(({ game, res }) => (
          <div className={`game-card ${res.verdict}`} key={game.id}>
            <div
              className="game-cover"
              style={{ background: `radial-gradient(120% 120% at 30% 20%, ${game.color}, #04160b 80%)` }}
            >
              <img
                className="game-cover-img"
                src={`./${game.img}`}
                alt={game.name}
                loading="lazy"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
              <span className={`badge-run ${res.verdict}`}>{res.label}</span>
              <span className="game-cover-name">{game.name}</span>
            </div>
            <div className="game-body">
              <div className="game-fps">
                <span className="fps-big">{res.fps}</span>
                <span className="fps-unit">FPS</span>
                <span className="fps-res">~1080p</span>
              </div>
              <div className="fps-bar">
                <div
                  className={`fps-fill ${res.verdict}`}
                  style={{ width: `${Math.min(100, (res.fps / 144) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hint" style={{ marginTop: 16 }}>
        Estimativa baseada principalmente na GPU (1080p). Ativar o <b>Turbo FPS</b> ou o
        <b> Modo Game</b> melhora os FPS reais. Se a GPU não for reconhecida, usamos um valor médio.
      </div>
    </>
  );
}
