import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { DriverInfo, DriverUpdate } from "../../electron/types";
import { formatBytes } from "../lib/format";
import MatrixConsole from "../components/MatrixConsole";

export default function Drivers({ elevated }: { elevated: boolean }) {
  const [tab, setTab] = useState<"updates" | "installed">("updates");
  const [matrix, setMatrix] = useState<null | { scanOnly: boolean }>(null);
  const [updates, setUpdates] = useState<DriverUpdate[]>([]);
  const [installed, setInstalled] = useState<DriverInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function scanUpdates() {
    setLoading(true);
    setMsg(null);
    const r = await api.driversScan();
    setUpdates(r.data ?? []);
    setLoading(false);
  }

  async function loadInstalled() {
    setLoading(true);
    const r = await api.driversList();
    setInstalled(r.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    scanUpdates();
  }, []);

  useEffect(() => {
    if (tab === "installed" && installed.length === 0) loadInstalled();
  }, [tab]);

  async function installAll() {
    setInstalling(true);
    setMsg(null);
    const r = await api.driversInstall([]); // vazio = todas encontradas
    if (r.needsAdmin) {
      setMsg("⚠ Para instalar drivers, feche e reabra o app como Administrador (clique direito → Executar como administrador).");
    } else if (r.ok) {
      setMsg(`✓ ${r.installed ?? 0} driver(s) instalados pelo Windows Update.${r.rebootRequired ? " Reinicie o computador para concluir." : ""}`);
      await scanUpdates();
    } else {
      setMsg(`Nao foi possivel instalar: ${r.message ?? "erro desconhecido"}`);
    }
    setInstalling(false);
  }

  return (
    <>
      <div className="page-head">
        <h2>Drivers</h2>
        <p>
          As atualizacoes vem do <strong>catalogo oficial do Windows Update</strong> — apenas
          drivers assinados digitalmente (WHQL) e verificados por certificado pela Microsoft.
          Nenhum driver e baixado de terceiros.
        </p>
      </div>

      <div className="turbo">
        <div className="turbo-glow" />
        <div className="turbo-info">
          <div className="turbo-title">Atualizar tudo automaticamente</div>
          <div className="turbo-sub">
            Verifica todos os drivers e componentes do Windows e instala as versoes
            assinadas mais recentes — sem esforco.
          </div>
        </div>
        <button className="btn-turbo" onClick={() => setMatrix({ scanOnly: !elevated })}>
          <span className="bolt">⚡</span>
          {elevated ? "TURBO UPDATE" : "VERIFICAR TUDO"}
        </button>
      </div>

      <div className="actions" style={{ marginTop: 0, marginBottom: 18 }}>
        <button className={`btn ${tab === "updates" ? "primary" : "ghost"}`} onClick={() => setTab("updates")}>
          Atualizacoes disponiveis
        </button>
        <button className={`btn ${tab === "installed" ? "primary" : "ghost"}`} onClick={() => setTab("installed")}>
          Drivers instalados
        </button>
      </div>

      {!elevated && tab === "updates" && (
        <div className="hint warn" style={{ marginBottom: 16 }}>
          Voce esta sem privilegios de administrador. Da para <strong>procurar</strong> atualizacoes,
          mas a <strong>instalacao</strong> exige reabrir o app como administrador.
        </div>
      )}

      {loading ? (
        <div className="empty"><div className="spinner" style={{ margin: "0 auto 12px" }} /> Consultando o Windows Update…</div>
      ) : tab === "updates" ? (
        updates.length === 0 ? (
          <div className="empty">✓ Nenhuma atualizacao de driver pendente. Seus drivers estao em dia.</div>
        ) : (
          <>
            <div className="list">
              {updates.map((u, i) => (
                <div className="row" key={i}>
                  <div className="row-main">
                    <div className="title">
                      {u.title}
                      <span className="tag signed">assinado</span>
                    </div>
                    <div className="desc">
                      {u.manufacturer} · {u.driverClass} · {u.driverDate || "data n/d"}
                    </div>
                  </div>
                  <div className="size">{u.sizeBytes ? formatBytes(u.sizeBytes) : ""}</div>
                </div>
              ))}
            </div>
            <div className="actions">
              <button className="btn primary" onClick={installAll} disabled={installing}>
                {installing ? <><span className="spinner" /> Instalando via Windows Update…</> : "Instalar tudo (seguro)"}
              </button>
              <button className="btn ghost" onClick={scanUpdates} disabled={installing}>Procurar novamente</button>
              <button className="btn ghost" onClick={() => api.openWindowsUpdate()}>Abrir Windows Update</button>
            </div>
          </>
        )
      ) : (
        <div className="list">
          {installed.length === 0 && <div className="empty">Nenhum driver listado.</div>}
          {installed.map((d, i) => (
            <div className="row" key={i}>
              <div className="row-main">
                <div className="title">
                  {d.deviceName}
                  <span className={`tag ${d.isSigned ? "signed" : "unsigned"}`}>
                    {d.isSigned ? "assinado" : "sem assinatura"}
                  </span>
                </div>
                <div className="desc">
                  {d.manufacturer} · {d.deviceClass} · v{d.driverVersion} · {d.driverDate || "s/ data"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {msg && <div className="hint" style={{ marginTop: 16 }}>{msg}</div>}

      {matrix && (
        <MatrixConsole
          kind="update"
          title="SYSTEM :: DRIVER OVERRIDE"
          driversOnly={true}
          scanOnly={matrix.scanOnly}
          onClose={() => {
            setMatrix(null);
            scanUpdates();
          }}
        />
      )}
    </>
  );
}
