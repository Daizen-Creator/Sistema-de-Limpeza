import { useEffect, useState } from "react";
import { api } from "../lib/api";
import MatrixConsole from "../components/MatrixConsole";

type Action = { id: string; label: string; desc: string; safe: boolean; admin?: boolean };

const ACTIONS: Action[] = [
  { id: "temp", label: "Limpar temporarios", desc: "Temp, Prefetch e cache de navegadores.", safe: true },
  { id: "trim", label: "Otimizar SSD (TRIM) / desfragmentar HD", desc: "Aplica TRIM em SSD e desfragmenta HD.", safe: true, admin: true },
  { id: "visualfx", label: "Desabilitar animacoes", desc: "Reduz transicoes visuais para mais velocidade.", safe: true },
  { id: "dns", label: "Limpar cache de DNS", desc: "Libera conexoes e reduz latencia.", safe: true },
  { id: "chkdsk", label: "Verificar erros de disco", desc: "Scan online do disco C: (sem reiniciar).", safe: true, admin: true },
  { id: "gpu", label: "Maximo desempenho de GPU", desc: "Prioriza a placa de video (pode exigir reinicio).", safe: true, admin: true },
  { id: "eventlogs", label: "Limpar logs do Windows", desc: "Event Viewer (Application, System, etc.).", safe: true, admin: true },
  { id: "winsxs", label: "Limpar updates antigos (WinSxS)", desc: "DISM StartComponentCleanup. Pode demorar.", safe: true, admin: true },
  { id: "driverstore", label: "Analisar drivers antigos", desc: "Reporta pacotes antigos (nao remove, por seguranca).", safe: true },
  // agressivas
  { id: "services", label: "Desabilitar servicos (Xbox, telemetria)", desc: "Encerra e desativa servicos. Reversivel.", safe: false, admin: true },
  { id: "indexing", label: "Reduzir indexacao de arquivos", desc: "Coloca o Windows Search em Manual.", safe: false, admin: true },
  { id: "pagefile", label: "Memoria virtual automatica", desc: "Deixa a paginacao gerenciada pelo sistema (reinicio).", safe: false, admin: true },
  { id: "registry", label: "Limpar registro (MRU)", desc: "Remove listas de recentes do registro.", safe: false },
];

const DEEP_CLEAN = ["temp", "trim", "dns", "chkdsk", "visualfx", "eventlogs", "winsxs"];

export default function Optimizations({ elevated }: { elevated: boolean }) {
  const [sel, setSel] = useState<Set<string>>(new Set(ACTIONS.filter((a) => a.safe).map((a) => a.id)));
  const [running, setRunning] = useState<null | { actions: string; title: string }>(null);

  // agendamento
  const [scheduled, setScheduled] = useState(false);
  const [schedMsg, setSchedMsg] = useState<string | null>(null);

  useEffect(() => {
    api.scheduleStatus().then((r) => setScheduled(r.enabled)).catch(() => {});
  }, []);

  function toggle(id: string) {
    setSel((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function run(ids: string[], title: string) {
    if (ids.length === 0) return;
    setRunning({ actions: ids.join(","), title });
  }

  async function toggleSchedule() {
    if (scheduled) {
      const r = await api.scheduleRemove();
      if (r.ok) { setScheduled(false); setSchedMsg("Agendamento removido."); }
    } else {
      const r = await api.scheduleCreate({ day: "MON", time: "03:00" });
      setSchedMsg(r.message ?? "");
      if (r.ok) setScheduled(true);
    }
  }

  return (
    <>
      <div className="page-head">
        <h2>Otimizacoes Avancadas</h2>
        <p>
          As 10 otimizacoes que deixam o PC ultra rapido + limpeza profunda. As acoes seguras ja
          vem marcadas. As <strong>agressivas</strong> ficam desmarcadas — leia antes de ativar.
        </p>
      </div>

      <div className="actions" style={{ marginTop: 0, marginBottom: 18 }}>
        <button className="btn primary" onClick={() => run([...sel], "SYSTEM :: OPTIMIZE")} disabled={sel.size === 0}>
          Aplicar selecionadas ({sel.size})
        </button>
        <button className="btn-turbo" onClick={() => run(DEEP_CLEAN, "SYSTEM :: DEEP CLEAN")}>
          <span className="bolt">🧨</span> DEEP CLEAN
        </button>
      </div>

      {!elevated && (
        <div className="hint warn" style={{ marginBottom: 16 }}>
          Varias acoes exigem administrador. O app tenta abrir elevado automaticamente.
        </div>
      )}

      <div className="grid cols-2">
        {ACTIONS.map((a) => (
          <label className={`opt-card ${sel.has(a.id) ? "on" : ""} ${!a.safe ? "danger" : ""}`} key={a.id}>
            <input type="checkbox" checked={sel.has(a.id)} onChange={() => toggle(a.id)} />
            <div>
              <div className="opt-title">
                {a.label}
                {a.admin && <span className="tag admin">admin</span>}
                {!a.safe && <span className="tag unsigned">agressiva</span>}
              </div>
              <div className="opt-desc">{a.desc}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Agendador */}
      <div className="card sched" style={{ marginTop: 18 }}>
        <div className="hw-ico">🗓️</div>
        <div style={{ flex: 1 }}>
          <div className="opt-title">Limpeza automatica agendada</div>
          <div className="opt-desc">
            Executa a limpeza de temporarios toda semana (segunda, 03:00), sem voce precisar lembrar.
          </div>
          {schedMsg && <div className="result-line">{schedMsg}</div>}
        </div>
        <button className={`btn ${scheduled ? "danger" : "primary"}`} onClick={toggleSchedule}>
          {scheduled ? "Desativar" : "Ativar"}
        </button>
      </div>

      {running && (
        <MatrixConsole
          kind="advopt"
          title={running.title}
          actions={running.actions}
          onClose={() => setRunning(null)}
        />
      )}
    </>
  );
}
