import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { DiskDrive, DiskFolder, DiskTree, DiskFile, DupGroup, SmartDisk } from "../../electron/types";
import { formatBytes, pct } from "../lib/format";

type Tab = "space" | "large" | "dupes";

export default function Disk() {
  const [smart, setSmart] = useState<SmartDisk[]>([]);
  const [drives, setDrives] = useState<DiskDrive[]>([]);
  const [folders, setFolders] = useState<DiskFolder[]>([]);
  const [path, setPath] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("space");

  const [tree, setTree] = useState<DiskTree | null>(null);
  const [large, setLarge] = useState<DiskFile[]>([]);
  const [dupes, setDupes] = useState<{ wasted: number; groups: DupGroup[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.diskSmart().then((r) => setSmart(r.data ?? [])).catch(() => {});
    api.diskRoots().then((r) => { setDrives(r.drives ?? []); setFolders(r.folders ?? []); }).catch(() => {});
  }, []);

  async function analyze(p: string, which: Tab = tab) {
    setPath(p);
    setLoading(true);
    try {
      if (which === "space") setTree((await api.diskTree(p)) as DiskTree);
      else if (which === "large") setLarge((await api.diskLarge(p)).items ?? []);
      else {
        const r = await api.diskDuplicates(p);
        setDupes({ wasted: r.wastedBytes, groups: r.groups ?? [] });
      }
    } catch {}
    setLoading(false);
  }

  function switchTab(t: Tab) {
    setTab(t);
    if (path) analyze(path, t);
  }

  return (
    <>
      <div className="page-head">
        <h2>Analise de Disco</h2>
        <p>Veja o que ocupa espaco, arquivos grandes, duplicados e a saude dos seus discos.</p>
      </div>

      {/* SMART / saude dos discos */}
      <div className="grid cols-3">
        {smart.map((d, i) => {
          const life = d.wear >= 0 ? 100 - d.wear : -1;
          return (
            <div className="card smart-card" key={i}>
              <div className="smart-top">
                <span className={`disk-badge ${d.media === "SSD" ? "ssd" : "hdd"}`}>
                  {d.media === "SSD" ? "SSD" : "HD"}
                </span>
                <span className={`pill ${d.health === "Healthy" ? "on" : "off"}`}>
                  {d.health === "Healthy" ? "SAUDAVEL" : d.health}
                </span>
              </div>
              <div className="smart-name" title={d.name}>{d.name}</div>
              <div className="smart-sz">{formatBytes(d.sizeBytes)}</div>
              {life >= 0 ? (
                <>
                  <div className="smart-life-h">Vida util: <b>{life}%</b></div>
                  <div className="progress"><div style={{ width: `${life}%` }} /></div>
                </>
              ) : (
                <div className="smart-life-h" style={{ color: "var(--text-dim)" }}>
                  Vida util: n/d (rode como admin)
                </div>
              )}
              <div className="smart-meta">
                {d.tempC >= 0 ? `${d.tempC}°C` : "temp n/d"}
                {d.powerOnHours >= 0 ? ` · ${d.powerOnHours}h ligado` : ""}
              </div>
            </div>
          );
        })}
        {smart.length === 0 && <div className="empty">Lendo saude dos discos…</div>}
      </div>

      {/* Seletor de local */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="sec-h">📂 Escolha o que analisar</div>
        <div className="chip-row">
          {drives.map((d) => (
            <button key={d.path} className={`chip ${path === d.path ? "on" : ""}`} onClick={() => analyze(d.path)}>
              💽 {d.path} <span className="chip-sub">{formatBytes(d.freeBytes)} livres</span>
            </button>
          ))}
          {folders.map((f) => (
            <button key={f.path} className={`chip ${path === f.path ? "on" : ""}`} onClick={() => analyze(f.path)}>
              📁 {f.label}
            </button>
          ))}
        </div>
      </div>

      {path && (
        <>
          <div className="actions" style={{ marginTop: 16, marginBottom: 12 }}>
            <button className={`btn ${tab === "space" ? "primary" : "ghost"}`} onClick={() => switchTab("space")}>Mapa de espaco</button>
            <button className={`btn ${tab === "large" ? "primary" : "ghost"}`} onClick={() => switchTab("large")}>Arquivos grandes</button>
            <button className={`btn ${tab === "dupes" ? "primary" : "ghost"}`} onClick={() => switchTab("dupes")}>Duplicados</button>
          </div>

          {loading ? (
            <div className="empty"><div className="spinner" style={{ margin: "0 auto 12px" }} /> Analisando {path}… (pode levar um tempo)</div>
          ) : tab === "space" ? (
            <TreeView tree={tree} onOpen={(p) => analyze(p, "space")} />
          ) : tab === "large" ? (
            <FileList files={large} empty="Nenhum arquivo maior que 1 GB aqui." />
          ) : (
            <DupeView dupes={dupes} />
          )}
        </>
      )}
    </>
  );
}

function TreeView({ tree, onOpen }: { tree: DiskTree | null; onOpen: (p: string) => void }) {
  if (!tree || !tree.ok) return <div className="empty">Sem dados.</div>;
  const max = tree.items[0]?.bytes || 1;
  return (
    <div className="card">
      <div className="tree-head">
        {tree.parent && <button className="btn-mini" onClick={() => onOpen(tree.parent!)}>⬆ Voltar</button>}
        <span className="tree-path" title={tree.path}>{tree.path}</span>
        <span className="tree-total">{formatBytes(tree.totalBytes)}</span>
      </div>
      {tree.truncated && <div className="hint" style={{ margin: "8px 0" }}>Analise parcial (pasta muito grande) — valores aproximados.</div>}
      <div className="tree-list">
        {tree.items.map((it) => (
          <div className={`tree-row ${it.isDir ? "dir" : ""}`} key={it.path}
               onClick={() => it.isDir && onOpen(it.path)}>
            <span className="tree-name">{it.isDir ? "📁" : "📄"} {it.name}</span>
            <div className="tree-bar"><div style={{ width: `${pct(it.bytes, max)}%` }} /></div>
            <span className="tree-size">{formatBytes(it.bytes)}</span>
            <button className="btn-mini" onClick={(e) => { e.stopPropagation(); api.revealInExplorer(it.path); }}>Abrir</button>
          </div>
        ))}
        {tree.items.length === 0 && <div className="empty">Pasta vazia.</div>}
      </div>
    </div>
  );
}

function FileList({ files, empty }: { files: DiskFile[]; empty: string }) {
  if (files.length === 0) return <div className="empty">{empty}</div>;
  return (
    <div className="card">
      <div className="tree-list">
        {files.map((f) => (
          <div className="tree-row" key={f.path}>
            <span className="tree-name" title={f.path}>📄 {f.name}</span>
            <span className="tree-size">{formatBytes(f.bytes)}</span>
            <button className="btn-mini" onClick={() => api.revealInExplorer(f.path)}>Abrir</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DupeView({ dupes }: { dupes: { wasted: number; groups: DupGroup[] } | null }) {
  if (!dupes) return <div className="empty">Sem dados.</div>;
  if (dupes.groups.length === 0) return <div className="empty">Nenhum arquivo duplicado encontrado. 🎉</div>;
  return (
    <>
      <div className="hint ok" style={{ marginBottom: 12 }}>
        <b>{formatBytes(dupes.wasted)}</b> desperdicados em {dupes.groups.length} grupo(s) de duplicados.
        Apague as copias extras direto no Explorer (o app nao apaga nada por seguranca).
      </div>
      {dupes.groups.map((g, i) => (
        <div className="card dup-group" key={i}>
          <div className="dup-head">
            <span>{g.count} copias · {formatBytes(g.bytes)} cada</span>
            <span className="dup-waste">desperdicio: {formatBytes(g.bytes * (g.count - 1))}</span>
          </div>
          {g.files.map((f) => (
            <div className="dup-file" key={f}>
              <span title={f}>{f}</span>
              <button className="btn-mini" onClick={() => api.revealInExplorer(f)}>Abrir</button>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
