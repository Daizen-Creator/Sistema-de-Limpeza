import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { buildReportHtml, type ReportData } from "../lib/report";
import { GAMES, gpuScore, estimate } from "../lib/games";

export default function Reports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "pdf" | "html">("");

  useEffect(() => {
    (async () => {
      const [system, hwR, drvR, smartR, secR, logR] = await Promise.all([
        api.systemInfo().catch(() => null),
        api.hwInfo().catch(() => null),
        api.driversList().catch(() => ({ data: [] })),
        api.diskSmart().catch(() => ({ data: [] })),
        api.secStatus().catch(() => ({ data: null })),
        api.logList().catch(() => ({ data: [] })),
      ]);
      const hw = (hwR as any)?.data ?? null;
      const gpu = gpuScore(hw?.gpuName);
      const ramGB = hw ? hw.ramTotalBytes / 1024 ** 3 : 8;
      const games = GAMES.map((g) => {
        const r = estimate(g, gpu.score, ramGB);
        return { name: g.name, fps: r.fps, verdict: r.verdict };
      }).sort((a, b) => b.fps - a.fps);

      setData({
        system: system as any,
        hw,
        drivers: (drvR as any)?.data ?? [],
        smart: (smartR as any)?.data ?? [],
        security: (secR as any)?.data ?? null,
        log: (logR as any)?.data ?? [],
        games,
      });
    })();
  }, []);

  async function generate(format: "pdf" | "html") {
    if (!data) return;
    setBusy(format);
    setMsg(null);
    const html = buildReportHtml(data);
    const r = await api.reportSave(html, format);
    setBusy("");
    if (r.ok) {
      setMsg(`✓ Relatorio salvo em: ${r.path}`);
      api.logAdd("relatorio", `Relatorio ${format.toUpperCase()} gerado`);
    } else {
      setMsg(r.message ?? "Falha ao gerar.");
    }
  }

  const runnable = data?.games.filter((g) => g.verdict !== "no").length ?? 0;

  return (
    <>
      <div className="page-head">
        <h2>Relatorios</h2>
        <p>Gere um relatorio tecnico completo do seu PC em PDF ou HTML para guardar ou compartilhar.</p>
      </div>

      <div className="report-hero">
        <div className="report-doc">📄</div>
        <div className="report-info">
          <div className="report-title">Relatorio Tecnico do Sistema</div>
          <div className="report-sub">
            Inclui hardware, saude dos discos, drivers, desempenho em jogos, seguranca e log.
          </div>
          <div className="report-actions">
            <button className="btn primary" onClick={() => generate("pdf")} disabled={!data || busy !== ""}>
              {busy === "pdf" ? <><span className="spinner" /> Gerando PDF…</> : "📥 Gerar PDF"}
            </button>
            <button className="btn ghost" onClick={() => generate("html")} disabled={!data || busy !== ""}>
              {busy === "html" ? <><span className="spinner" /> Gerando HTML…</> : "🌐 Gerar HTML"}
            </button>
          </div>
        </div>
      </div>

      {msg && <div className="hint ok" style={{ marginTop: 14 }}>{msg}</div>}

      {/* Previa do conteudo */}
      <div className="grid cols-3" style={{ marginTop: 16 }}>
        <div className="card"><h3>HARDWARE</h3><div className="metric" style={{ fontSize: 18 }}>{data?.hw?.cpuName ? "OK" : "…"}</div><div className="sub">{data?.hw?.gpuName ?? ""}</div></div>
        <div className="card"><h3>DRIVERS</h3><div className="metric">{data?.drivers.length ?? "…"}</div><div className="sub">listados no relatorio</div></div>
        <div className="card"><h3>JOGOS QUE RODAM</h3><div className="metric">{data ? `${runnable}/${GAMES.length}` : "…"}</div><div className="sub">estimativa 1080p</div></div>
      </div>

      <div className="hint" style={{ marginTop: 14 }}>
        O relatorio e salvo em <b>Documentos\NexusClean-Reports</b> e abre no Explorer.
        Para enviar por e-mail ou nuvem, e so anexar o arquivo gerado.
      </div>
    </>
  );
}
