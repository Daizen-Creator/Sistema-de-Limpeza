import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { CleanItem, CleanResult } from "../../electron/types";
import { formatBytes } from "../lib/format";

export default function Cleaner() {
  const [items, setItems] = useState<CleanItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState<{ total: number; results: CleanResult[] } | null>(null);

  async function scan() {
    setScanning(true);
    setResult(null);
    const r = await api.cleanScan();
    setItems(r.items);
    // pre-seleciona itens com conteudo que nao exigem admin
    setSelected(new Set(r.items.filter((i) => i.bytes > 0 && !i.requiresAdmin).map((i) => i.id)));
    setScanning(false);
  }

  useEffect(() => {
    scan();
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function clean() {
    setCleaning(true);
    const r = await api.cleanRun([...selected]);
    setResult({ total: r.totalFreedBytes, results: r.results });
    setCleaning(false);
    await scan();
  }

  const selectedBytes = items
    .filter((i) => selected.has(i.id))
    .reduce((a, b) => a + b.bytes, 0);

  return (
    <>
      <div className="page-head">
        <h2>Limpeza de disco</h2>
        <p>
          Selecione o que deseja remover. Apagamos apenas arquivos temporarios e caches
          descartaveis — seus documentos, fotos e programas nunca sao tocados.
        </p>
      </div>

      {scanning ? (
        <div className="empty">
          <div className="spinner" style={{ margin: "0 auto 12px" }} /> Analisando o sistema…
        </div>
      ) : (
        <>
          <div className="list">
            {items.map((it) => (
              <label className="row" key={it.id} style={{ cursor: "pointer" }}>
                <input
                  className="check"
                  type="checkbox"
                  checked={selected.has(it.id)}
                  onChange={() => toggle(it.id)}
                  disabled={it.bytes === 0}
                />
                <div className="row-main">
                  <div className="title">
                    {it.label}
                    {it.requiresAdmin && <span className="tag admin">admin</span>}
                  </div>
                  <div className="desc">{it.description}</div>
                </div>
                <div className="size">{formatBytes(it.bytes)}</div>
              </label>
            ))}
          </div>

          <div className="actions">
            <button className="btn primary" onClick={clean} disabled={cleaning || selected.size === 0}>
              {cleaning ? <><span className="spinner" /> Limpando…</> : `Limpar selecionados (${formatBytes(selectedBytes)})`}
            </button>
            <button className="btn ghost" onClick={scan} disabled={cleaning}>Analisar de novo</button>
          </div>

          {result && (
            <div className="hint ok" style={{ marginTop: 18 }}>
              <div className="total-freed">✓ {formatBytes(result.total)} liberados</div>
              {result.results.map((r) => (
                <div className="result-line" key={r.id}>
                  {r.id}: {formatBytes(r.freedBytes)} {r.note !== "ok" ? `— ${r.note}` : ""}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
