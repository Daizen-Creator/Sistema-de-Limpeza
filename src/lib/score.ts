import type { HardwareInfo, SystemInfo, SmartDisk, DriverInfo, BootItem } from "../../electron/types";

export interface ScorePart { name: string; score: number; detail: string; weight: number; }
export interface ScoreResult { total: number; label: string; parts: ScorePart[]; }

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function computeScore(d: {
  hw: HardwareInfo | null;
  system: SystemInfo | null;
  smart: SmartDisk[];
  drivers: DriverInfo[];
  boot: BootItem[];
}): ScoreResult {
  const parts: ScorePart[] = [];

  // 1) RAM livre
  if (d.hw) {
    const freePct = (d.hw.ramFreeBytes / d.hw.ramTotalBytes) * 100;
    parts.push({ name: "Memoria RAM", score: clamp(freePct * 2.5), weight: 20, detail: `${freePct.toFixed(0)}% livre` });
  }

  // 2) Disco do sistema
  if (d.system && d.system.diskTotalBytes) {
    const freePct = (d.system.diskFreeBytes / d.system.diskTotalBytes) * 100;
    parts.push({ name: "Espaco em disco", score: clamp(freePct * 4), weight: 20, detail: `${freePct.toFixed(0)}% livre` });
  }

  // 3) Saude do armazenamento (prefere SSD)
  if (d.smart.length) {
    const ssd = d.smart.find((s) => s.media === "SSD");
    const disk = ssd ?? d.smart[0];
    let s: number, det: string;
    if (disk.media === "SSD") {
      s = disk.wear >= 0 ? 100 - disk.wear : disk.health === "Healthy" ? 92 : 50;
      det = `SSD ${disk.health === "Healthy" ? "saudavel" : disk.health}`;
    } else {
      s = disk.health === "Healthy" ? 65 : 40;
      det = "apenas HD (mais lento)";
    }
    parts.push({ name: "Saude do disco", score: clamp(s), weight: 20, detail: det });
  }

  // 4) Drivers assinados
  if (d.drivers.length) {
    const signed = d.drivers.filter((x) => x.isSigned).length;
    const pct = (signed / d.drivers.length) * 100;
    parts.push({ name: "Drivers assinados", score: clamp(pct), weight: 15, detail: `${signed}/${d.drivers.length}` });
  }

  // 5) Inicializacao (menos impacto alto = melhor)
  if (d.boot.length) {
    const heavy = d.boot.filter((b) => b.enabled && b.impact === "Alto").length;
    parts.push({ name: "Inicializacao", score: clamp(100 - heavy * 15), weight: 15, detail: `${heavy} de impacto alto` });
  }

  // 6) Temperatura da CPU (se disponivel)
  if (d.hw && d.hw.cpuTempC != null && d.hw.cpuTempC > 0) {
    const t = d.hw.cpuTempC;
    parts.push({ name: "Temperatura CPU", score: clamp(100 - Math.max(0, t - 50) * 2.5), weight: 10, detail: `${t}°C` });
  }

  const totalWeight = parts.reduce((a, b) => a + b.weight, 0) || 1;
  const total = clamp(parts.reduce((a, b) => a + b.score * b.weight, 0) / totalWeight);

  const label =
    total >= 85 ? "Excelente" : total >= 70 ? "Bom" : total >= 50 ? "Regular" : "Precisa otimizar";

  return { total, label, parts };
}
