import type {
  SystemInfo, HardwareInfo, DriverInfo, SmartDisk, SecurityStatus, EventLog,
} from "../../electron/types";
import { formatBytes } from "./format";

export interface ReportData {
  system: SystemInfo | null;
  hw: HardwareInfo | null;
  drivers: DriverInfo[];
  smart: SmartDisk[];
  security: SecurityStatus | null;
  log: EventLog[];
  games: { name: string; fps: number; verdict: string }[];
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

function rows(arr: string[][]) {
  return arr.map((r) => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="k"' : ""}>${c}</td>`).join("")}</tr>`).join("");
}

export function buildReportHtml(d: ReportData): string {
  const now = new Date().toLocaleString("pt-BR");
  const hw = d.hw;
  const verdictColor = (v: string) => (v === "smooth" ? "#12b866" : v === "ok" ? "#c78a00" : "#c0392b");

  const sysRows = d.system ? rows([
    ["Sistema operacional", esc(d.system.os)],
    ["Computador", esc(d.system.computerName)],
    ["Usuario", esc(d.system.user)],
    ["Privilegio", d.system.elevated ? "Administrador" : "Padrao"],
    ["Disco do sistema", `${formatBytes(d.system.diskFreeBytes)} livres de ${formatBytes(d.system.diskTotalBytes)}`],
  ]) : "";

  const hwRows = hw ? rows([
    ["Processador", `${esc(hw.cpuName)} — ${hw.cpuCores} nucleos / ${hw.cpuThreads} threads @ ${(hw.cpuClockMhz / 1000).toFixed(1)} GHz`],
    ["Placa de video", `${esc(hw.gpuName)} — driver ${esc(hw.gpuDriver)}${hw.gpuVramBytes > 0 ? " · " + formatBytes(hw.gpuVramBytes) + " VRAM" : ""}`],
    ["Memoria RAM", `${formatBytes(hw.ramTotalBytes)} (${formatBytes(hw.ramFreeBytes)} livres)`],
  ]) : "";

  const diskRows = hw ? hw.disks.map((x) =>
    `<tr><td class="k">${x.media === "SSD" ? "SSD" : "HD"}</td><td>${esc(x.name)}</td><td>${formatBytes(x.sizeBytes)}</td></tr>`).join("") : "";

  const smartRows = d.smart.map((s) =>
    `<tr><td class="k">${esc(s.name)}</td><td>${esc(s.health)}</td><td>${s.wear >= 0 ? (100 - s.wear) + "%" : "n/d"}</td><td>${s.tempC >= 0 ? s.tempC + "°C" : "n/d"}</td></tr>`).join("");

  const drvRows = d.drivers.slice(0, 25).map((x) =>
    `<tr><td class="k">${esc(x.deviceName)}</td><td>${esc(x.manufacturer)}</td><td>${esc(x.driverVersion)}</td><td>${x.isSigned ? "sim" : "nao"}</td></tr>`).join("");

  const gameRows = d.games.map((g) =>
    `<tr><td class="k">${esc(g.name)}</td><td>${g.fps} FPS</td><td style="color:${verdictColor(g.verdict)};font-weight:700">${g.verdict === "smooth" ? "Roda liso" : g.verdict === "ok" ? "Roda" : "Nao recomendado"}</td></tr>`).join("");

  const secRows = d.security ? rows([
    ["Telemetria", d.security.telemetryOn ? "Ativa" : "Desativada"],
    ["Firewall", d.security.firewall.map((f) => `${f.name}: ${f.enabled ? "ON" : "OFF"}`).join(" · ")],
  ]) : "";

  const logRows = d.log.slice(0, 20).map((e) =>
    `<tr><td class="k">${esc(new Date(e.time).toLocaleString("pt-BR"))}</td><td>${esc(e.type)}</td><td>${esc(e.detail)}</td></tr>`).join("");

  const section = (title: string, body: string, head?: string) => body
    ? `<section><h2>${title}</h2><table>${head ? `<thead>${head}</thead>` : ""}<tbody>${body}</tbody></table></section>` : "";

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatorio NexusClean</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1a2b22; margin: 0; padding: 32px 40px; background: #fff; }
  .header { border-bottom: 3px solid #12b866; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { font-size: 26px; font-weight: 800; letter-spacing: 1px; }
  .brand span { color: #12b866; }
  .sub { font-size: 12px; color: #5a6b62; margin-top: 4px; }
  .meta { text-align: right; font-size: 12px; color: #5a6b62; }
  h2 { font-size: 15px; color: #0d7a4a; border-left: 4px solid #12b866; padding-left: 10px; margin: 24px 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  td, th { padding: 7px 10px; border-bottom: 1px solid #e6ece9; text-align: left; }
  thead th { background: #f0f7f3; color: #0d7a4a; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
  td.k { font-weight: 600; color: #24463a; width: 34%; }
  .footer { margin-top: 30px; padding-top: 14px; border-top: 1px solid #e6ece9; font-size: 11px; color: #8a9a92; text-align: center; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="header">
    <div>
      <div class="brand">NEXUS<span>CLEAN</span></div>
      <div class="sub">Relatorio Tecnico do Sistema</div>
    </div>
    <div class="meta">Gerado em ${esc(now)}<br>por Daniel Santos Ciriaco</div>
  </div>

  ${section("Sistema", sysRows)}
  ${section("Hardware", hwRows)}
  ${section("Armazenamento", diskRows, "<tr><th>Tipo</th><th>Modelo</th><th>Capacidade</th></tr>")}
  ${section("Saude dos discos (SMART)", smartRows, "<tr><th>Disco</th><th>Saude</th><th>Vida util</th><th>Temp</th></tr>")}
  ${section("Desempenho em jogos (estimado, 1080p)", gameRows, "<tr><th>Jogo</th><th>FPS</th><th>Status</th></tr>")}
  ${section("Drivers instalados", drvRows, "<tr><th>Dispositivo</th><th>Fabricante</th><th>Versao</th><th>Assinado</th></tr>")}
  ${section("Seguranca", secRows)}
  ${section("Log de eventos recentes", logRows, "<tr><th>Data</th><th>Tipo</th><th>Detalhe</th></tr>")}

  <div class="footer">NexusClean — Otimizador do Windows · criado por Daniel Santos Ciriaco</div>
</body></html>`;
}
