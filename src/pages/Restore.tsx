import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { RestorePoint, BackupInfo } from "../../electron/types";
import { formatBytes } from "../lib/format";
import MatrixConsole from "../components/MatrixConsole";

export default function Restore() {
  const [points, setPoints] = useState<RestorePoint[]>([]);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [task, setTask] = useState<null | { kind: "restorepoint" | "revert" | "backup"; title: string }>(null);

  async function refresh() {
    api.restorePoints().then((r) => setPoints(r.data ?? [])).catch(() => {});
    api.restoreBackups().then((r) => setBackups(r.data ?? [])).catch(() => {});
  }
  useEffect(() => { refresh(); }, []);

  async function applyRestore(p: RestorePoint) {
    if (!confirm(
      `Restaurar o sistema para:\n"${p.description}" (${p.date})?\n\n` +
      `O computador VAI REINICIAR e desfazer alteracoes feitas depois desse ponto. ` +
      `Seus arquivos pessoais nao sao afetados.`
    )) return;
    const r = await api.restoreApply(p.seq);
    setMsg(r.message ?? null);
  }

  function afterTask() {
    setTask(null);
    api.logAdd("restauracao", "Acao de backup/restauracao executada");
    refresh();
  }

  return (
    <>
      <div className="page-head">
        <h2>Backup & Restauracao</h2>
        <p>Crie um ponto de restauracao antes de otimizar e reverta tudo com 1 clique se precisar.</p>
      </div>

      {msg && <div className="hint" style={{ marginBottom: 14 }}>{msg}</div>}

      {/* Acoes principais */}
      <div className="grid cols-3">
        <div className="card sec-card">
          <div className="sec-h">🛟 Ponto de restauracao</div>
          <div className="sec-d">Cria um checkpoint do Windows para voltar depois.</div>
          <button className="btn primary" onClick={() => setTask({ kind: "restorepoint", title: "SYSTEM :: RESTORE POINT" })}>
            Criar ponto agora
          </button>
        </div>
        <div className="card sec-card">
          <div className="sec-h">💾 Backup de drivers + registro</div>
          <div className="sec-d">Exporta drivers e chaves criticas para Documentos.</div>
          <button className="btn primary" onClick={() => setTask({ kind: "backup", title: "SYSTEM :: SAFE BACKUP" })}>
            Fazer backup
          </button>
        </div>
        <div className="card sec-card">
          <div className="sec-h">↩️ Reverter otimizacoes</div>
          <div className="sec-d">Desfaz as alteracoes do app e volta ao padrao.</div>
          <button className="btn danger" onClick={() => setTask({ kind: "revert", title: "SYSTEM :: REVERT" })}>
            Reverter tudo
          </button>
        </div>
      </div>

      {/* Pontos de restauracao */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="sec-h">🕘 Pontos de restauracao do sistema</div>
        <div className="sec-d" style={{ marginBottom: 10 }}>Restaure para um estado anterior (reinicia o PC).</div>
        <div className="svc-list">
          {points.length === 0 && <div className="empty">Nenhum ponto encontrado (crie um acima).</div>}
          {points.map((p) => (
            <div className="svc-row" key={p.seq}>
              <div className="svc-info">
                <span className="svc-name">{p.description}</span>
                <span className="svc-meta">{p.date} · #{p.seq} · {p.type}</span>
              </div>
              <button className="btn-mini" onClick={() => applyRestore(p)}>Restaurar</button>
            </div>
          ))}
        </div>
      </div>

      {/* Backups do app */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="sec-h">📦 Backups do app</div>
        <div className="sec-d" style={{ marginBottom: 10 }}>
          Salvos em Documentos\NexusClean-Backup. O "Reverter" usa o mais recente.
        </div>
        <div className="svc-list">
          {backups.length === 0 && <div className="empty">Nenhum backup ainda. Clique em "Fazer backup".</div>}
          {backups.map((b, i) => (
            <div className="svc-row" key={i}>
              <div className="svc-info">
                <span className="svc-name">{b.name}</span>
                <span className="svc-meta">{b.date}</span>
              </div>
              <span className="pill">{formatBytes(b.sizeBytes)}</span>
            </div>
          ))}
        </div>
      </div>

      {task && (
        <MatrixConsole kind={task.kind} title={task.title} onClose={afterTask} />
      )}
    </>
  );
}
