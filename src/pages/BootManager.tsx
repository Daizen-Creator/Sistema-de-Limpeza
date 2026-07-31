import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { BootItem } from "../../electron/types";

export default function BootManager() {
  const [items, setItems] = useState<BootItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await api.bootList();
    setItems(r.data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggle(it: BootItem) {
    const r = await api.bootSet(it.name, it.kind, it.scope, !it.enabled);
    setMsg(r.message ?? null);
    if (r.ok) {
      setItems((prev) => prev.map((x) => (x.name === it.name && x.scope === it.scope ? { ...x, enabled: !x.enabled } : x)));
    } else {
      load();
    }
  }

  const enabled = items.filter((i) => i.enabled).length;
  const heavy = items.filter((i) => i.enabled && i.impact === "Alto").length;

  const impactClass = (i: string) => (i === "Alto" ? "hi" : i === "Medio" ? "mid" : "lo");

  return (
    <>
      <div className="page-head">
        <h2>Inicializacao — Boot Manager</h2>
        <p>Controle o que abre junto com o Windows. Desativar itens pesados deixa o boot mais rapido.</p>
      </div>

      {msg && <div className="hint" style={{ marginBottom: 12 }}>{msg}</div>}

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <div className="card"><h3>PROGRAMAS NA INICIALIZACAO</h3><div className="metric">{items.length}</div></div>
        <div className="card"><h3>ATIVOS</h3><div className="metric">{enabled}</div></div>
        <div className="card"><h3>IMPACTO ALTO (ATIVOS)</h3><div className="metric" style={{ color: heavy ? "var(--danger)" : "var(--accent)" }}>{heavy}</div></div>
      </div>

      {loading ? (
        <div className="empty"><div className="spinner" style={{ margin: "0 auto 12px" }} /> Lendo a inicializacao…</div>
      ) : (
        <div className="boot-list">
          {items.map((it, i) => (
            <div className={`boot-row ${!it.enabled ? "off" : ""}`} key={i}>
              <div className={`imp-dot ${impactClass(it.impact)}`} title={`Impacto ${it.impact}`} />
              <div className="boot-info">
                <div className="boot-name">
                  {it.name}
                  <span className={`tag ${it.scope === "sistema" ? "admin" : ""}`}>{it.scope}</span>
                  <span className={`imp-badge ${impactClass(it.impact)}`}>{it.impact}</span>
                </div>
                <div className="boot-cmd" title={it.command}>{it.command}</div>
              </div>
              <label className="switch" title={it.enabled ? "Desativar" : "Ativar"}>
                <input type="checkbox" checked={it.enabled} onChange={() => toggle(it)} />
                <span className="slider" />
              </label>
            </div>
          ))}
          {items.length === 0 && <div className="empty">Nenhum programa na inicializacao.</div>}
        </div>
      )}

      <div className="hint" style={{ marginTop: 14 }}>
        Desativar usa a mesma tecnica do Gerenciador de Tarefas (reversivel — e so reativar aqui).
        Itens de <b>sistema</b> exigem administrador. O <b>impacto</b> e uma estimativa.
      </div>
    </>
  );
}
