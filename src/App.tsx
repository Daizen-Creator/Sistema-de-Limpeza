import { useEffect, useRef, useState } from "react";
import { api, isNative } from "./lib/api";
import { usePoll } from "./lib/usePoll";
import type { SystemInfo } from "../electron/types";
import Dashboard from "./pages/Dashboard";
import Cleaner from "./pages/Cleaner";
import Drivers from "./pages/Drivers";
import Optimize from "./pages/Optimize";
import Optimizations from "./pages/Optimizations";
import Profiles from "./pages/Profiles";
import Games from "./pages/Games";
import Alerts from "./pages/Alerts";
import Restore from "./pages/Restore";
import Disk from "./pages/Disk";
import BootManager from "./pages/BootManager";
import Network from "./pages/Network";
import Reports from "./pages/Reports";
import Score from "./pages/Score";
import Sensors from "./pages/Sensors";
import HackerMode from "./pages/HackerMode";
import Processes from "./pages/Processes";
import Security from "./pages/Security";
import Logo from "./components/Logo";
import CreatorAvatar from "./components/CreatorAvatar";
import TitleBar from "./components/TitleBar";

type Page = "dashboard" | "cleaner" | "drivers" | "optimize" | "optimizations" | "profiles" | "games" | "score" | "sensors" | "processes" | "boot" | "network" | "alerts" | "restore" | "disk" | "reports" | "hacker" | "security";

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: "dashboard", label: "Painel", icon: "▚" },
  { id: "cleaner", label: "Limpeza", icon: "🧹" },
  { id: "disk", label: "Disco", icon: "💽" },
  { id: "drivers", label: "Drivers", icon: "🔧" },
  { id: "optimize", label: "Turbo FPS", icon: "⚡" },
  { id: "optimizations", label: "Otimizacoes", icon: "🚀" },
  { id: "profiles", label: "Perfis", icon: "🎮" },
  { id: "games", label: "Roda?", icon: "🕹" },
  { id: "score", label: "Pontuacao", icon: "🏆" },
  { id: "sensors", label: "Sensores", icon: "🌡" },
  { id: "processes", label: "Processos", icon: "📋" },
  { id: "boot", label: "Inicializacao", icon: "🚦" },
  { id: "network", label: "Rede", icon: "🛰" },
  { id: "alerts", label: "Alertas", icon: "🔔" },
  { id: "restore", label: "Backup", icon: "🛟" },
  { id: "reports", label: "Relatorios", icon: "📄" },
  { id: "hacker", label: "Modo Hacker", icon: "☠" },
  { id: "security", label: "Seguranca", icon: "🛡" },
];

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [update, setUpdate] = useState<import("../electron/types").UpdateCheck | null>(null);
  const [checkedManually, setCheckedManually] = useState(false);
  const [banner, setBanner] = useState(true);

  useEffect(() => {
    api.systemInfo().then(setInfo).catch(() => {});
    api.updaterCheck().then(setUpdate).catch(() => {});
  }, []);

  async function checkUpdate() {
    setCheckedManually(true);
    const r = await api.updaterCheck();
    setUpdate(r);
    setBanner(true);
  }

  // --- monitor global de alertas (modulo 16) ---
  const lastNotified = useRef<Record<string, number>>({});
  usePoll(async () => {
    const COOLDOWN = 5 * 60 * 1000; // 5 min entre alertas do mesmo tipo
    const fire = (key: string, title: string, body: string) => {
      const now = Date.now();
      if (lastNotified.current[key] && now - lastNotified.current[key] < COOLDOWN) return;
      lastNotified.current[key] = now;
      api.notify(title, body);
      api.logAdd("alerta", body);
    };
    const { data: hw } = await api.hwInfo();
    if (!hw) return;
    if (hw.cpuTempC != null && hw.cpuTempC > 85)
      fire("temp", "🌡️ Temperatura crítica", `CPU em ${hw.cpuTempC}°C (limite 85°C).`);
    const ramFree = (hw.ramFreeBytes / hw.ramTotalBytes) * 100;
    if (ramFree < 10) fire("ram", "📊 Memória baixa", `Apenas ${ramFree.toFixed(0)}% de RAM livre.`);
    const vol = hw.volumes?.[0];
    if (vol) {
      const diskFree = (vol.freeBytes / vol.totalBytes) * 100;
      if (diskFree < 5) fire("disk", "💽 Disco cheio", `${vol.drive} com apenas ${diskFree.toFixed(0)}% livre.`);
    }
  }, 20000);

  return (
    <>
    <TitleBar />
    {update?.hasUpdate && banner && (
      <div className="update-banner">
        <span>🚀 Nova versao <b>{update.latest}</b> disponivel! (voce tem a {update.current})</span>
        <div className="ub-actions">
          <button className="btn-mini" onClick={() => update.url && api.updaterOpen(update.url)}>Baixar</button>
          <button className="ub-close" onClick={() => setBanner(false)}>✕</button>
        </div>
      </div>
    )}
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo"><Logo size={38} /></div>
          <div>
            <h1>NEXUS<span className="brand-accent">CLEAN</span></h1>
            <span>Otimizacao &amp; Drivers · Windows</span>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "active" : ""}
              onClick={() => setPage(n.id)}
            >
              <span className="ico">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className={`badge-admin ${info?.elevated ? "on" : "off"}`}>
            {info?.elevated ? "✓ Administrador" : "⚠ Sem elevacao"}
          </span>
          <div style={{ marginTop: 10 }}>
            {isNative ? info?.computerName ?? "—" : "Modo demonstracao (navegador)"}
          </div>
          <div className="credit">
            <CreatorAvatar size={26} />
            <span>Criado por <b>Daniel Santos Ciriaco</b></span>
          </div>
          <div className="ver-row">
            <span>v{update?.current ?? "1.0.0"}</span>
            <button className="ver-check" onClick={checkUpdate}>🔄 Verificar</button>
          </div>
          {checkedManually && update && !update.hasUpdate && (
            <div className="ver-status">
              {update.ok ? "✓ Voce esta atualizado" : "Sem conexao com o repositorio"}
            </div>
          )}
        </div>
      </aside>

      <main className="content">
        {page === "dashboard" && <Dashboard info={info} onNavigate={setPage} />}
        {page === "cleaner" && <Cleaner />}
        {page === "drivers" && <Drivers elevated={!!info?.elevated} />}
        {page === "optimize" && <Optimize elevated={!!info?.elevated} />}
        {page === "optimizations" && <Optimizations elevated={!!info?.elevated} />}
        {page === "profiles" && <Profiles />}
        {page === "games" && <Games />}
        {page === "score" && <Score onNavigate={setPage} />}
        {page === "sensors" && <Sensors />}
        {page === "processes" && <Processes />}
        {page === "boot" && <BootManager />}
        {page === "network" && <Network />}
        {page === "alerts" && <Alerts />}
        {page === "restore" && <Restore />}
        {page === "disk" && <Disk />}
        {page === "reports" && <Reports />}
        {page === "hacker" && <HackerMode />}
        {page === "security" && <Security />}
      </main>
    </div>
    </>
  );
}
