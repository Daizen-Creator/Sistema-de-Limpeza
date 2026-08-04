// Estimativa de desempenho em jogos com base no hardware detectado.
// IMPORTANTE: sao ESTIMATIVAS aproximadas (1080p), nao um benchmark real.

/** Tabela de "score" relativo de GPUs (GTX 1050 Ti = 100 como referencia). */
const GPU_SCORES: { re: RegExp; score: number }[] = [
  // NVIDIA RTX 40
  { re: /rtx\s*4090/i, score: 1000 },
  { re: /rtx\s*4080/i, score: 800 },
  { re: /rtx\s*4070\s*ti/i, score: 620 },
  { re: /rtx\s*4070/i, score: 520 },
  { re: /rtx\s*4060\s*ti/i, score: 400 },
  { re: /rtx\s*4060/i, score: 340 },
  // NVIDIA RTX 30
  { re: /rtx\s*3090/i, score: 640 },
  { re: /rtx\s*3080/i, score: 560 },
  { re: /rtx\s*3070/i, score: 430 },
  { re: /rtx\s*3060\s*ti/i, score: 370 },
  { re: /rtx\s*3060/i, score: 300 },
  { re: /rtx\s*3050/i, score: 210 },
  // NVIDIA RTX 20
  { re: /rtx\s*2080/i, score: 400 },
  { re: /rtx\s*2070/i, score: 330 },
  { re: /rtx\s*2060/i, score: 250 },
  // NVIDIA GTX 16
  { re: /gtx\s*1660\s*ti/i, score: 230 },
  { re: /gtx\s*1660/i, score: 200 },
  { re: /gtx\s*1650/i, score: 135 },
  // NVIDIA GTX 10
  { re: /gtx\s*1080/i, score: 300 },
  { re: /gtx\s*1070/i, score: 230 },
  { re: /gtx\s*1060/i, score: 150 },
  { re: /gtx\s*1050\s*ti/i, score: 100 },
  { re: /gtx\s*1050/i, score: 85 },
  { re: /gt\s*1030/i, score: 55 },
  // AMD Radeon RX
  { re: /rx\s*7900/i, score: 850 },
  { re: /rx\s*7800/i, score: 640 },
  { re: /rx\s*7600/i, score: 350 },
  { re: /rx\s*6700\s*xt/i, score: 440 },
  { re: /rx\s*6600/i, score: 300 },
  { re: /rx\s*580/i, score: 160 },
  { re: /rx\s*570/i, score: 140 },
  { re: /rx\s*550/i, score: 60 },
  // Integradas
  { re: /(radeon.*vega|vega\s*\d)/i, score: 45 },
  { re: /radeon.*graphics/i, score: 40 },
  { re: /iris\s*xe/i, score: 55 },
  { re: /uhd\s*graphics/i, score: 25 },
  { re: /hd\s*graphics/i, score: 18 },
];

export function gpuScore(name: string | undefined): { score: number; known: boolean } {
  if (!name) return { score: 60, known: false };
  for (const g of GPU_SCORES) if (g.re.test(name)) return { score: g.score, known: true };
  // heuristica: nomes com "RTX/GTX/RX" desconhecidos -> chute medio
  if (/rtx|gtx|radeon\s*rx/i.test(name)) return { score: 120, known: false };
  return { score: 45, known: false };
}

export interface Game {
  id: string;
  name: string;
  icon: string;
  color: string;      // cor da "capa" (fallback caso a imagem falhe)
  img: string;        // foto de capa do jogo
  fpsAt100: number;   // FPS estimado num GPU score 100 (GTX 1050 Ti), 1080p
  minScore: number;   // score minimo para rodar
  recScore: number;   // score para rodar liso
  ramGB: number;      // RAM recomendada
  cap?: number;       // limite de FPS do jogo (se houver)
}

export const GAMES: Game[] = [
  { id: "roblox",   name: "Roblox",              icon: "🟥", color: "#e2231a", img: "games/roblox.jpg",     fpsAt100: 130, minScore: 15, recScore: 55, ramGB: 4 },
  { id: "gtasa",    name: "GTA San Andreas",     icon: "🌴", color: "#e6a817", img: "games/gtasa.png",      fpsAt100: 200, minScore: 12, recScore: 40, ramGB: 4, cap: 240 },
  { id: "minecraft",name: "Minecraft (Java)",    icon: "🟫", color: "#6cbb3c", img: "games/minecraft.jpg",  fpsAt100: 110, minScore: 18, recScore: 60, ramGB: 6 },
  { id: "valorant", name: "Valorant",            icon: "🔫", color: "#ff4655", img: "games/valorant.jpg",   fpsAt100: 150, minScore: 20, recScore: 70, ramGB: 8 },
  { id: "lol",      name: "League of Legends",   icon: "⚔️", color: "#0596aa", img: "games/lol.jpg",        fpsAt100: 160, minScore: 15, recScore: 60, ramGB: 4 },
  { id: "freefire", name: "Free Fire (PC)",      icon: "🔥", color: "#ff8c00", img: "games/freefire.jpg",   fpsAt100: 140, minScore: 15, recScore: 55, ramGB: 4 },
  { id: "amongus",  name: "Among Us",            icon: "👨‍🚀", color: "#c51111", img: "games/amongus.webp",   fpsAt100: 220, minScore: 10, recScore: 30, ramGB: 4, cap: 240 },
  { id: "cs2",      name: "Counter-Strike 2",    icon: "💣", color: "#de9b35", img: "games/cs2.jpg",        fpsAt100: 90,  minScore: 45, recScore: 150, ramGB: 8 },
  { id: "fortnite", name: "Fortnite",            icon: "🛡️", color: "#9d4dff", img: "games/fortnite.jpg",   fpsAt100: 75,  minScore: 50, recScore: 150, ramGB: 8 },
  { id: "sims4",    name: "The Sims 4",          icon: "🏠", color: "#2fbf4f", img: "games/sims4.png",      fpsAt100: 90,  minScore: 35, recScore: 110, ramGB: 8 },
  { id: "gtav",     name: "GTA V",               icon: "🚗", color: "#75b843", img: "games/gtav.webp",      fpsAt100: 55,  minScore: 55, recScore: 150, ramGB: 8 },
  { id: "forza5",   name: "Forza Horizon 5",     icon: "🏎️", color: "#7b2ff7", img: "games/forza5.jpg",     fpsAt100: 42,  minScore: 130, recScore: 300, ramGB: 12 },
  { id: "eldenring",name: "Elden Ring",          icon: "🗡️", color: "#c9a227", img: "games/eldenring.jpg",  fpsAt100: 45,  minScore: 130, recScore: 280, ramGB: 12, cap: 60 },
  { id: "rdr2",     name: "Red Dead Redemption 2",icon: "🤠", color: "#b3122b", img: "games/rdr2.jpg",       fpsAt100: 30,  minScore: 140, recScore: 320, ramGB: 12 },
  { id: "cyberpunk",name: "Cyberpunk 2077",      icon: "🌆", color: "#d4d40a", img: "games/cyberpunk.png",  fpsAt100: 26,  minScore: 150, recScore: 350, ramGB: 12 },
];

export type Verdict = "smooth" | "ok" | "no";
export type Preset = "low" | "medium" | "high" | "ultra";
export type Resolution = "480p" | "720p" | "1080p" | "1440p";

export interface GameResult {
  verdict: Verdict;
  fps: number;
  label: string;
}

// Multiplicadores de FPS por resolucao (base = 1080p) e por preset grafico (base = medio).
const RES_MULT: Record<Resolution, number> = { "480p": 2.1, "720p": 1.5, "1080p": 1.0, "1440p": 0.62 };
const PRESET_MULT: Record<Preset, number> = { low: 1.45, medium: 1.0, high: 0.72, ultra: 0.52 };

export const RESOLUTIONS: { id: Resolution; label: string }[] = [
  { id: "480p", label: "480p" },
  { id: "720p", label: "720p" },
  { id: "1080p", label: "1080p" },
  { id: "1440p", label: "1440p" },
];
export const PRESETS: { id: Preset; label: string }[] = [
  { id: "low", label: "Baixo" },
  { id: "medium", label: "Medio" },
  { id: "high", label: "Alto" },
  { id: "ultra", label: "Ultra" },
];

export function estimate(
  game: Game, userScore: number, ramGB: number,
  preset: Preset = "medium", resolution: Resolution = "1080p"
): GameResult {
  let fps = game.fpsAt100 * (userScore / 100) * RES_MULT[resolution] * PRESET_MULT[preset];
  fps = Math.round(fps);
  if (game.cap) fps = Math.min(fps, game.cap);
  fps = Math.max(0, Math.min(fps, 360));

  const ramOk = ramGB >= game.ramGB * 0.7;
  let verdict: Verdict;
  let label: string;
  if (!ramOk) {
    verdict = "no"; label = "RAM insuficiente";
  } else if (fps >= 60) {
    verdict = "smooth"; label = "Roda liso";
  } else if (fps >= 30) {
    verdict = "ok"; label = "Roda";
  } else {
    verdict = "no"; label = "Nao recomendado";
  }
  return { verdict, fps, label };
}
