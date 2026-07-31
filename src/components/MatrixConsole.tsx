import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { UpdateDone } from "../../electron/types";

/**
 * Overlay estilo "Matrix / hacker" com terminal ao vivo.
 * Mostra em tempo real os passos REAIS da atualizacao de drivers.
 */
export default function MatrixConsole({
  kind,
  title,
  driversOnly = true,
  scanOnly = false,
  actions = "",
  onClose,
}: {
  kind:
    | "update" | "optimize" | "hacker" | "advopt" | "sfc" | "backup" | "profile"
    | "restorepoint" | "revert" | "trace";
  title: string;
  driversOnly?: boolean;
  scanOnly?: boolean;
  actions?: string;
  onClose: () => void;
}) {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState<UpdateDone | null>(null);
  const [finished, setFinished] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- assina eventos e dispara a atualizacao ---
  useEffect(() => {
    const offLog = api.onUpdateLog((l) => setLines((prev) => [...prev, l]));
    const offDone = api.onUpdateDone((r) => setDone(r));
    const offExit = api.onUpdateExit(() => setFinished(true));
    api.startTask({ kind, driversOnly, scanOnly, actions });
    return () => {
      offLog();
      offDone();
      offExit();
    };
  }, [kind, driversOnly, scanOnly, actions]);

  // --- auto-scroll ---
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [lines]);

  // --- chuva de codigo (matrix rain) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const chars = "アカサタナハマヤラワ0123456789ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜｵ<>[]{}#$%&=+*".split("");
    let cols = 0;
    let drops: number[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      cols = Math.floor(canvas.width / 14);
      drops = new Array(cols).fill(1).map(() => Math.floor(Math.random() * -50));
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.fillStyle = "rgba(3, 8, 5, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "14px monospace";
      for (let i = 0; i < drops.length; i++) {
        const t = chars[Math.floor(Math.random() * chars.length)];
        const x = i * 14;
        const y = drops[i] * 14;
        ctx.fillStyle = Math.random() > 0.975 ? "#c9ffd6" : "#1fbf5a";
        ctx.fillText(t, x, y);
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  function stop() {
    api.stopTask();
    setFinished(true);
  }

  const lineClass = (l: string) => {
    if (l.startsWith("[+]")) return "ok";
    if (l.startsWith("[>]")) return "item";
    if (l.startsWith("[*]")) return "step";
    if (l.startsWith("[ERR]")) return "err";
    if (l.startsWith("[!]")) return "warn";
    if (l.startsWith("===")) return "head";
    return "";
  };

  const needsAdmin = done?.status === "SCANNED";

  return (
    <div className="matrix-overlay">
      <canvas ref={canvasRef} className="matrix-rain" />
      <div className="scanlines" />

      <div className="matrix-panel">
        <div className="matrix-head">
          <span className="dotmk" /> {title}
          <span className="by">por Daniel Santos Ciriaco</span>
        </div>

        <div className="matrix-log" ref={logRef}>
          {lines.map((l, i) => (
            <div key={i} className={`ml ${lineClass(l)}`}>
              {l}
            </div>
          ))}
          {!finished && <div className="ml cursor">▊</div>}
        </div>

        <div className={`matrix-bar ${finished ? "full" : ""}`}>
          <i />
        </div>

        <div className="matrix-actions">
          {!finished ? (
            <>
              <span className="running">
                <span className="pulse" /> {scanOnly ? "VERIFICANDO" : "ATUALIZANDO"}…
              </span>
              <button className="mbtn ghost" onClick={stop}>
                PARAR
              </button>
            </>
          ) : (
            <>
              {done?.status === "DONE" && (
                <span className="result ok">
                  ✓ {done.count} item(ns) atualizados
                  {done.reboot ? " · reinicie o PC" : ""}
                </span>
              )}
              {done?.status === "ERROR" && <span className="result err">Falha na atualizacao</span>}
              {needsAdmin && (
                <span className="result warn">
                  {done?.count} encontrados — precisa de administrador
                </span>
              )}
              {needsAdmin && (
                <button className="mbtn admin" onClick={() => api.relaunchAsAdmin()}>
                  EXECUTAR COMO ADMIN
                </button>
              )}
              <button className="mbtn" onClick={onClose}>
                FECHAR
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
