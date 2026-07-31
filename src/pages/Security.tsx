import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { SecurityStatus, ServiceInfo, StartupInfo } from "../../electron/types";
import MatrixConsole from "../components/MatrixConsole";

export default function Security() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [startup, setStartup] = useState<StartupInfo[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [task, setTask] = useState<null | { kind: "sfc" | "backup"; title: string }>(null);

  async function loadAll() {
    api.secStatus().then((r) => setStatus(r.data)).catch(() => {});
    api.secServices().then((r) => setServices(r.data ?? [])).catch(() => {});
    api.secStartup().then((r) => setStartup(r.data ?? [])).catch(() => {});
  }
  useEffect(() => { loadAll(); }, []);

  async function toggleTelemetry() {
    const r = await api.secTelemetry(!(status?.telemetryOn));
    setMsg(r.message ?? null);
    loadAll();
  }
  async function toggleFirewall(profile: string, on: boolean) {
    const r = await api.secFirewall(profile, on);
    setMsg(r.message ?? null);
    loadAll();
  }
  async function serviceAction(name: string, action: string) {
    const r = await api.secServiceSet(name, action);
    setMsg(r.message ?? null);
    loadAll();
  }

  return (
    <>
      <div className="page-head">
        <h2>Seguranca</h2>
        <p>Controle telemetria, firewall, servicos, inicializacao e faca backup antes de otimizar.</p>
      </div>

      {msg && <div className="hint" style={{ marginBottom: 14 }}>{msg}</div>}

      {/* Acoes rapidas */}
      <div className="grid cols-2">
        {/* 6.1 Telemetria */}
        <div className="card sec-card">
          <div className="sec-top">
            <div><div className="sec-h">🔒 Telemetria do Windows</div>
              <div className="sec-d">Coleta de dados de uso (DiagTrack).</div></div>
            <span className={`pill ${status?.telemetryOn ? "on" : "off"}`}>
              {status?.telemetryOn ? "ATIVA" : "DESATIVADA"}
            </span>
          </div>
          <button className={`btn ${status?.telemetryOn ? "danger" : "primary"}`} onClick={toggleTelemetry}>
            {status?.telemetryOn ? "Desativar telemetria" : "Reativar telemetria"}
          </button>
        </div>

        {/* 6.4 Firewall */}
        <div className="card sec-card">
          <div className="sec-h">🧱 Firewall do Windows</div>
          <div className="sec-d" style={{ marginBottom: 10 }}>Ative/desative por perfil de rede.</div>
          <div className="fw-list">
            {status?.firewall.map((f) => (
              <div className="fw-row" key={f.name}>
                <span>{f.name}</span>
                <span className={`pill ${f.enabled ? "on" : "off"}`}>{f.enabled ? "ON" : "OFF"}</span>
                <button className="btn-mini" onClick={() => toggleFirewall(f.name, !f.enabled)}>
                  {f.enabled ? "Desativar" : "Ativar"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 6.3 SFC */}
        <div className="card sec-card">
          <div className="sec-h">🩺 Integridade do sistema (SFC)</div>
          <div className="sec-d">Verifica e repara arquivos do Windows (SFC + DISM). Pode demorar.</div>
          <button className="btn primary" onClick={() => setTask({ kind: "sfc", title: "SYSTEM :: INTEGRITY CHECK" })}>
            Verificar agora
          </button>
        </div>

        {/* 6.6 Backup */}
        <div className="card sec-card">
          <div className="sec-h">💾 Backup rapido</div>
          <div className="sec-d">Exporta drivers atuais + chaves de registro para Documentos.</div>
          <button className="btn primary" onClick={() => setTask({ kind: "backup", title: "SYSTEM :: SAFE BACKUP" })}>
            Fazer backup
          </button>
        </div>
      </div>

      {/* 6.5 Servicos */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="sec-h">⚙️ Servicos gerenciaveis</div>
        <div className="sec-d" style={{ marginBottom: 10 }}>
          Somente servicos nao-criticos. Parar os inuteis libera recursos.
        </div>
        <div className="svc-list">
          {services.map((s) => (
            <div className="svc-row" key={s.name}>
              <div className="svc-info">
                <span className="svc-name">{s.display}</span>
                <span className="svc-meta">{s.name} · {s.startup}</span>
              </div>
              <span className={`pill ${s.status === "Running" ? "on" : "off"}`}>{s.status}</span>
              <div className="svc-acts">
                {s.status === "Running"
                  ? <button className="btn-mini" onClick={() => serviceAction(s.name, "stop")}>Parar</button>
                  : <button className="btn-mini" onClick={() => serviceAction(s.name, "start")}>Iniciar</button>}
                <button className="btn-mini danger" onClick={() => serviceAction(s.name, "disable")}>Desabilitar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6.2 Inicializacao */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="sec-h">🚀 Inicializacao do Windows</div>
        <div className="sec-d">Programas que abrem com o sistema ({startup.length}).</div>
        <div className="svc-list" style={{ marginTop: 8 }}>
          {startup.slice(0, 12).map((s, i) => (
            <div className="svc-row" key={i}>
              <div className="svc-info">
                <span className="svc-name">{s.name}</span>
                <span className="svc-meta" title={s.command}>{s.command}</span>
              </div>
              <span className="pill">{s.location.includes("HKLM") ? "sistema" : "usuario"}</span>
            </div>
          ))}
        </div>
        <div className="hint" style={{ marginTop: 10 }}>
          Para ativar/desativar itens de inicializacao com seguranca, use o Boot Manager (em breve)
          ou o Gerenciador de Tarefas do Windows (aba Inicializar).
        </div>
      </div>

      {task && (
        <MatrixConsole kind={task.kind} title={task.title} onClose={() => setTask(null)} />
      )}
    </>
  );
}
