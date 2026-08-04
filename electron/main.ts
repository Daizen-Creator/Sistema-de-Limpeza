import { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage, screen } from "electron";
import { trayMenuHtml } from "./tray-menu";
import { toastHtml } from "./toast";
import { updateWindowHtml } from "./update-window";
// electron-updater e CommonJS — import=require garante pegar o autoUpdater em runtime
import electronUpdaterPkg = require("electron-updater");
const autoUpdater: any = electronUpdaterPkg.autoUpdater ?? electronUpdaterPkg;
import { spawn, execFileSync, ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { splashHtml } from "./splash";

/**
 * Processo principal do Electron.
 *
 * Responsabilidades:
 *  - Gerar um token de sessao e uma porta livre.
 *  - Iniciar o backend Java (127.0.0.1) com esse token.
 *  - Criar a janela com sandbox reforcado (sem nodeIntegration, contextIsolation on).
 *  - Encaminhar chamadas do renderer para o backend via IPC (o renderer nunca fala
 *    diretamente com a rede).
 */

const isDev = !!process.env.VITE_DEV_SERVER_URL;
const APP_TOKEN = randomBytes(24).toString("hex");

// Corrige "tela preta" intermitente: em muitos PCs/drivers e em maquinas
// virtuais o compositor de GPU do Chromium falha e deixa a janela preta.
// Desligar a aceleracao de hardware resolve (a UI e leve, nao precisa de GPU).
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu-compositing");

/** Compara duas versoes tipo "1.2.0". Retorna true se 'a' for mais nova que 'b'. */
function isNewer(a: string, b: string): boolean {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

/** Verifica se o processo esta rodando como administrador (Windows). */
function isAdminSync(): boolean {
  try {
    execFileSync("net", ["session"], { stdio: "ignore", windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Se o app (empacotado) nao estiver elevado, reabre como administrador e sai.
 * Usa o argumento --elevated para nao entrar em loop.
 */
function ensureAdmin(): boolean {
  if (isDev) return true; // em dev nao forca elevacao
  if (process.argv.includes("--elevated")) return true;
  if (isAdminSync()) return true;
  try {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Start-Process -FilePath '${process.execPath}' -ArgumentList '--elevated' -Verb RunAs`,
      ],
      { windowsHide: true }
    );
  } catch {
    /* usuario pode ter recusado o UAC; segue sem elevacao */
    return true;
  }
  return false; // vai reabrir elevado
}

let backend: ChildProcess | null = null;
let backendPort = 8733;
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let hiddenNoticeShown = false;

function iconPath(): string {
  return isDev
    ? path.join(process.cwd(), "build", "app.ico")
    : path.join(process.resourcesPath, "app.ico");
}

function showWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
}

let iconDataUrl = "";
function getIconDataUrl(): string {
  if (!iconDataUrl) {
    const i = nativeImage.createFromPath(iconPath());
    iconDataUrl = i.isEmpty() ? "" : i.toDataURL();
  }
  return iconDataUrl;
}

// --- notificacoes customizadas (toast tema hacker) ---
const toastWins: BrowserWindow[] = [];
const TW = 340, TH = 96, TGAP = 10;

function positionToasts() {
  const wa = screen.getPrimaryDisplay().workArea;
  toastWins.forEach((w, i) => {
    if (w.isDestroyed()) return;
    w.setPosition(wa.x + wa.width - TW - 16, wa.y + wa.height - (TH + TGAP) * (i + 1) - 8);
  });
}

function notify(title: string, body: string) {
  try {
    const win = new BrowserWindow({
      width: TW, height: TH, frame: false, transparent: true, resizable: false,
      movable: false, skipTaskbar: true, alwaysOnTop: true, focusable: false,
      show: false, hasShadow: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    });
    toastWins.push(win);
    win.setAlwaysOnTop(true, "screen-saver");
    positionToasts();
    win.loadURL(toastHtml(title, body, getIconDataUrl()));
    win.once("ready-to-show", () => win.showInactive());
    const timer = setTimeout(() => { if (!win.isDestroyed()) win.close(); }, 5600);
    win.on("closed", () => {
      clearTimeout(timer);
      const idx = toastWins.indexOf(win);
      if (idx >= 0) toastWins.splice(idx, 1);
      positionToasts();
    });
  } catch {}
}

/** Consulta o GitHub por uma versao mais nova. Reutilizado pelo IPC e pela bandeja. */
async function checkForUpdate() {
  const current = app.getVersion();
  const repo = "Daizen-Creator/Sistema-de-Limpeza";
  const headers = { "User-Agent": "NexusClean-Updater", Accept: "application/vnd.github+json" };
  try {
    let latest: string | null = null;
    let url = `https://github.com/${repo}/releases`;
    const r = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers });
    if (r.ok) {
      const j: any = await r.json();
      latest = String(j.tag_name ?? "").replace(/^v/i, "") || null;
      url = j.html_url ?? url;
    } else if (r.status === 404) {
      const t = await fetch(`https://api.github.com/repos/${repo}/tags`, { headers });
      if (t.ok) {
        const arr: any = await t.json();
        if (Array.isArray(arr) && arr.length) {
          latest = String(arr[0].name ?? "").replace(/^v/i, "") || null;
          url = `https://github.com/${repo}`;
        }
      }
    }
    const hasUpdate = latest ? isNewer(latest, current) : false;
    return { ok: true, current, latest, hasUpdate, url };
  } catch {
    return { ok: false, current, message: "Sem conexao ou repositorio indisponivel." };
  }
}

function mb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(0) + " MB";
}

/** Roda um script de tarefa em silencio (sem UI) e notifica ao terminar. Usado pela bandeja. */
function runSilent(kind: TaskKind, actions: string, doneMsg: string) {
  const args = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptForKind(kind)];
  if (kind === "profile") args.push("-Profile", actions || "game");
  if (kind === "advopt") args.push("-Actions", actions || "temp,dns,visualfx");
  const p = spawn("powershell.exe", args, { windowsHide: true });
  p.on("exit", () => notify("NexusClean", doneMsg));
}

async function quickCleanTray() {
  try {
    const r = await callBackend("POST", "/api/clean/run", { ids: ["temp_user", "temp_windows"] });
    notify("NexusClean", `Limpeza rapida: ${mb(r.totalFreedBytes || 0)} liberados.`);
  } catch {
    notify("NexusClean", "Nao foi possivel limpar agora.");
  }
}

// --- AUTO-UPDATE (electron-updater): baixa e instala a nova versao sozinho ---
let updateWin: BrowserWindow | null = null;

function showUpdateWindow() {
  if (updateWin && !updateWin.isDestroyed()) return;
  updateWin = new BrowserWindow({
    width: 460, height: 380, frame: false, transparent: true, resizable: false,
    center: true, alwaysOnTop: true, show: false, hasShadow: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  updateWin.loadURL(updateWindowHtml);
  updateWin.once("ready-to-show", () => updateWin?.show());
  updateWin.on("closed", () => { updateWin = null; });
}

function setUpdateProgress(pct: number, status: string) {
  if (updateWin && !updateWin.isDestroyed()) {
    updateWin.webContents
      .executeJavaScript(`window.setProgress && window.setProgress(${pct}, ${JSON.stringify(status)})`)
      .catch(() => {});
  }
}

let updaterReady = false;
function setupAutoUpdater() {
  if (isDev || updaterReady) return;
  updaterReady = true;
  autoUpdater.logger = console; // loga tudo no stdout para diagnostico
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("update-available", (info: any) => {
    showUpdateWindow();
    setUpdateProgress(-1, `Baixando versao ${info?.version ?? ""}...`);
  });
  autoUpdater.on("download-progress", (p: any) => {
    setUpdateProgress(p?.percent ?? -1, `Baixando atualizacao... ${Math.round(p?.percent ?? 0)}%`);
  });
  autoUpdater.on("checking-for-update", () => diag("updater: checking..."));
  autoUpdater.on("update-not-available", (i: any) => diag(`updater: sem update (latest ${i?.version})`));
  autoUpdater.on("update-downloaded", () => {
    diag("updater: baixado, instalando");
    setUpdateProgress(100, "Instalando... o app vai reiniciar");
    setTimeout(() => { isQuitting = true; try { autoUpdater.quitAndInstall(true, true); } catch (e: any) { diag("quitAndInstall erro: " + e?.message); } }, 1400);
  });
  autoUpdater.on("error", (e: any) => {
    diag("updater ERROR: " + (e?.message ?? e));
    if (updateWin) { setUpdateProgress(-1, "Falha ao atualizar"); setTimeout(() => updateWin?.close(), 2500); }
  });
}

/** Verifica e, se houver atualizacao, baixa/instala automaticamente. */
async function triggerUpdateCheck(announce: boolean) {
  if (isDev) { if (announce) notify("NexusClean", "Atualizacoes so no app instalado."); return; }
  setupAutoUpdater();
  if (announce) notify("NexusClean", "Verificando atualizacoes...");
  try {
    diag(`updater: checkForUpdates (versao atual ${app.getVersion()})`);
    const r: any = await autoUpdater.checkForUpdates();
    const latest = r?.updateInfo?.version;
    diag(`updater: resposta latest=${latest}`);
    if (latest && isNewer(latest, app.getVersion())) {
      // update-available cuidara do download + tela
    } else if (announce) {
      notify("NexusClean", `Voce esta na versao mais recente (v${app.getVersion()}).`);
    }
  } catch (e: any) {
    diag("updater: checkForUpdates FALHOU: " + (e?.message ?? e));
    if (announce) notify("NexusClean", "Nao foi possivel verificar agora.");
  }
}

async function checkUpdatesTray() {
  await triggerUpdateCheck(true);
}

// --- menu de bandeja CUSTOMIZADO (janela HTML tema hacker, estilo Steam) ---
let trayMenuWin: BrowserWindow | null = null;

function closeTrayMenu() {
  if (trayMenuWin && !trayMenuWin.isDestroyed()) trayMenuWin.close();
  trayMenuWin = null;
}

function showTrayMenu() {
  if (trayMenuWin && !trayMenuWin.isDestroyed()) { closeTrayMenu(); return; }
  const W = 246, H = 372;
  const pt = screen.getCursorScreenPoint();
  const wa = screen.getDisplayNearestPoint(pt).workArea;
  let x = pt.x - W + 12;
  let y = pt.y - H - 6;
  x = Math.max(wa.x + 4, Math.min(x, wa.x + wa.width - W - 4));
  y = Math.max(wa.y + 4, Math.min(y, wa.y + wa.height - H - 4));
  trayMenuWin = new BrowserWindow({
    width: W, height: H, x, y, frame: false, transparent: true, resizable: false,
    skipTaskbar: true, alwaysOnTop: true, show: false, hasShadow: false,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false },
  });
  trayMenuWin.setAlwaysOnTop(true, "screen-saver");
  trayMenuWin.loadURL(trayMenuHtml(getIconDataUrl(), app.getVersion()));
  trayMenuWin.once("ready-to-show", () => { trayMenuWin?.show(); trayMenuWin?.focus(); });
  trayMenuWin.on("blur", () => closeTrayMenu());
  trayMenuWin.on("closed", () => { trayMenuWin = null; });
}

function handleTrayAction(id: string) {
  closeTrayMenu();
  switch (id) {
    case "open": showWindow(); break;
    case "turbo": runSilent("optimize", "", "Turbo FPS aplicado com sucesso."); break;
    case "clean": quickCleanTray(); break;
    case "prof-game": runSilent("profile", "game", "Modo Game ativado. Bom jogo!"); break;
    case "prof-work": runSilent("profile", "work", "Modo Trabalho ativado."); break;
    case "prof-battery": runSilent("profile", "battery", "Modo Economia ativado."); break;
    case "update": checkUpdatesTray(); break;
    case "quit": isQuitting = true; app.quit(); break;
  }
}

function createTray() {
  if (tray) return;
  let img = nativeImage.createFromPath(iconPath());
  if (img.isEmpty()) img = nativeImage.createEmpty();
  tray = new Tray(img);
  tray.setToolTip("NexusClean — Otimizador do Windows · por Daniel Santos Ciriaco");
  tray.on("click", () => showWindow());
  tray.on("right-click", () => showTrayMenu());
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 440,
    height: 540,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    backgroundColor: "#00000000",
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  splashWindow.loadURL(splashHtml);
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
  splashWindow = null;
}

function findFreePort(start: number): Promise<number> {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(findFreePort(start + 1)));
    srv.once("listening", () => {
      const port = (srv.address() as any).port;
      srv.close(() => resolve(port));
    });
    srv.listen(start, "127.0.0.1");
  });
}

function backendJarPath(): string {
  // Em dev usamos build/backend.jar; empacotado, vem de resources.
  if (isDev) return path.join(process.cwd(), "build", "backend.jar");
  return path.join(process.resourcesPath, "backend.jar");
}

/**
 * Caminho do java. Prioriza o JRE EMBUTIDO (para funcionar em PCs sem Java
 * instalado); cai para o java do sistema como ultimo recurso.
 */
function javaBinPath(): string {
  const bundledDev = path.join(process.cwd(), "build", "jre", "bin", "java.exe");
  const bundledPkg = path.join(process.resourcesPath, "jre", "bin", "java.exe");
  if (isDev && existsSync(bundledDev)) return bundledDev;
  if (!isDev && existsSync(bundledPkg)) return bundledPkg;
  return "java"; // fallback: java do sistema (se existir)
}

type TaskKind =
  | "update" | "optimize" | "hacker" | "advopt" | "sfc" | "backup" | "profile"
  | "restorepoint" | "revert" | "trace";

function scriptForKind(kind: TaskKind): string {
  const dir = isDev ? path.join(process.cwd(), "electron") : process.resourcesPath;
  if (kind === "optimize") return path.join(dir, "optimize.ps1");
  if (kind === "hacker") return path.join(dir, "hacker-scan.ps1");
  if (kind === "advopt") return path.join(dir, "advanced-opt.ps1");
  if (kind === "sfc") return path.join(dir, "sfc.ps1");
  if (kind === "backup") return path.join(dir, "backup.ps1");
  if (kind === "profile") return path.join(dir, "profile.ps1");
  if (kind === "restorepoint") return path.join(dir, "restore-point.ps1");
  if (kind === "revert") return path.join(dir, "revert.ps1");
  if (kind === "trace") return path.join(dir, "trace.ps1");
  return path.join(dir, "auto-update.ps1");
}

let updateProc: ChildProcess | null = null;

/** Roda um script de tarefa e transmite o log ao vivo para a janela. */
function startTask(kind: TaskKind, driversOnly: boolean, scanOnly: boolean, actions: string) {
  if (updateProc) return; // ja rodando
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptForKind(kind),
  ];
  if (kind === "update" && driversOnly) args.push("-DriversOnly");
  if (kind === "update" && scanOnly) args.push("-ScanOnly");
  if (kind === "advopt") args.push("-Actions", actions || "temp,dns,visualfx");
  if (kind === "profile") args.push("-Profile", actions || "game");
  if (kind === "trace") args.push("-Target", actions || "google.com");

  updateProc = spawn("powershell.exe", args, { windowsHide: true });

  const send = (channel: string, payload: unknown) =>
    mainWindow?.webContents.send(channel, payload);

  updateProc.stdout?.on("data", (d: Buffer) => {
    d.toString("utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        if (!line.trim()) return;
        const m = line.match(/^STATUS::(\w+)::(\d+)::(true|false)$/);
        if (m) {
          send("update:done", {
            status: m[1],
            count: Number(m[2]),
            reboot: m[3] === "true",
          });
        } else {
          send("update:log", line);
        }
      });
  });
  updateProc.stderr?.on("data", (d: Buffer) =>
    send("update:log", "[ERR] " + d.toString("utf8").trim())
  );
  updateProc.on("exit", () => {
    send("update:exit", {});
    updateProc = null;
  });
}

function stopTask() {
  if (updateProc) {
    updateProc.kill();
    updateProc = null;
  }
}

function diag(msg: string) {
  try {
    console.log("[diag]", msg);
    const dir = app.getPath("userData");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "nexus-startup.log"), `[${new Date().toISOString()}] ${msg}\n`, { flag: "a" });
  } catch {}
}

function spawnBackend(bin: string, jar: string) {
  diag(`spawn backend: ${bin} -jar ${jar} (port ${backendPort})`);
  backend = spawn(bin, ["-jar", jar], {
    env: { ...process.env, APP_PORT: String(backendPort), APP_TOKEN },
    windowsHide: true,
  });
  backend.stdout?.on("data", (d) => console.log("[java]", d.toString().trim()));
  backend.stderr?.on("data", (d) => console.error("[java:err]", d.toString().trim()));
  backend.on("exit", (code) => { diag(`java exit ${code}`); console.log("[java] finalizou:", code); });
  backend.on("error", (e) => diag(`java ERROR: ${e.message}`));
}

async function startBackend(): Promise<void> {
  backendPort = await findFreePort(8733);
  const jar = backendJarPath();

  spawnBackend(javaBinPath(), jar);

  try {
    await waitForBackend();
  } catch (e) {
    // fallback: tenta o java do sistema se o embutido nao respondeu
    diag(`backend nao respondeu com ${javaBinPath()}; tentando 'java' do sistema`);
    try { backend?.kill(); } catch {}
    spawnBackend("java", jar);
    await waitForBackend();
  }
}

async function waitForBackend(): Promise<void> {
  const url = `http://127.0.0.1:${backendPort}/api/health`;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Backend Java nao respondeu a tempo.");
}

async function callBackend(method: string, urlPath: string, body?: unknown) {
  const res = await fetch(`http://127.0.0.1:${backendPort}${urlPath}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-App-Token": APP_TOKEN,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, message: "Resposta invalida do backend." };
  }
}

function registerIpc() {
  ipcMain.handle("system:info", () => callBackend("GET", "/api/system/info"));
  ipcMain.handle("clean:scan", () => callBackend("GET", "/api/clean/scan"));
  ipcMain.handle("clean:run", (_e, ids: string[]) =>
    callBackend("POST", "/api/clean/run", { ids })
  );
  ipcMain.handle("drivers:list", () => callBackend("GET", "/api/drivers/list"));
  ipcMain.handle("drivers:scan", () => callBackend("POST", "/api/drivers/scan"));
  ipcMain.handle("drivers:install", (_e, titles: string[]) =>
    callBackend("POST", "/api/drivers/install", { titles: titles ?? [] })
  );
  ipcMain.handle("app:isElevated", async () => {
    const info = await callBackend("GET", "/api/system/info");
    return !!info.elevated;
  });
  ipcMain.handle("app:openWindowsUpdate", () => {
    shell.openExternal("ms-settings:windowsupdate");
    return { ok: true };
  });

  // --- agendamento de limpeza (Task Scheduler) ---
  const TASK = "NexusClean-LimpezaAutomatica";
  const schedScript = () =>
    isDev
      ? path.join(process.cwd(), "electron", "scheduled-clean.ps1")
      : path.join(process.resourcesPath, "scheduled-clean.ps1");

  ipcMain.handle("schedule:status", () => {
    try {
      execFileSync("schtasks", ["/Query", "/TN", TASK], { stdio: "ignore", windowsHide: true });
      return { ok: true, enabled: true };
    } catch {
      return { ok: true, enabled: false };
    }
  });
  ipcMain.handle("schedule:create", (_e, opts: { day?: string; time?: string }) => {
    const day = opts?.day ?? "MON";
    const time = opts?.time ?? "03:00";
    const tr = `powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "${schedScript()}"`;
    try {
      execFileSync(
        "schtasks",
        ["/Create", "/TN", TASK, "/TR", tr, "/SC", "WEEKLY", "/D", day, "/ST", time, "/F"],
        { stdio: "ignore", windowsHide: true }
      );
      return { ok: true, message: `Limpeza agendada para toda semana (${day} ${time}).` };
    } catch (e: any) {
      return { ok: false, message: "Falha ao agendar: " + (e?.message ?? "erro") };
    }
  });
  ipcMain.handle("schedule:remove", () => {
    try {
      execFileSync("schtasks", ["/Delete", "/TN", TASK, "/F"], { stdio: "ignore", windowsHide: true });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? "erro" };
    }
  });

  // --- controles da janela (barra de titulo personalizada) ---
  ipcMain.handle("win:minimize", () => mainWindow?.minimize());
  ipcMain.handle("win:maximize", () => {
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
    return mainWindow.isMaximized();
  });
  ipcMain.handle("win:close", () => mainWindow?.close());
  ipcMain.handle("win:isMaximized", () => !!mainWindow?.isMaximized());

  ipcMain.handle("hw:info", () => callBackend("GET", "/api/hw/info"));
  ipcMain.handle("proc:list", () => callBackend("GET", "/api/proc/list"));
  ipcMain.handle("proc:kill", (_e, pid: number) => callBackend("POST", "/api/proc/kill", { pid }));
  ipcMain.handle("proc:priority", (_e, p: { pid: number; level: string }) =>
    callBackend("POST", "/api/proc/priority", p)
  );
  ipcMain.handle("net:stats", () => callBackend("GET", "/api/net/stats"));
  ipcMain.handle("term:run", (_e, command: string) => callBackend("POST", "/api/term/run", { command }));
  ipcMain.handle("sensors:read", () => callBackend("GET", "/api/sensors"));
  ipcMain.handle("net:processes", () => callBackend("GET", "/api/net/processes"));
  ipcMain.handle("net:ping", (_e, p: { host: string; count: number }) =>
    callBackend("POST", "/api/net/ping", p)
  );

  ipcMain.handle("sec:status", () => callBackend("GET", "/api/sec/status"));
  ipcMain.handle("sec:telemetry", (_e, on: boolean) => callBackend("POST", "/api/sec/telemetry", { on }));
  ipcMain.handle("sec:firewall", (_e, p: { profile: string; on: boolean }) =>
    callBackend("POST", "/api/sec/firewall", p)
  );
  ipcMain.handle("sec:services", () => callBackend("GET", "/api/sec/services"));
  ipcMain.handle("sec:serviceSet", (_e, p: { name: string; action: string }) =>
    callBackend("POST", "/api/sec/service-set", p)
  );
  ipcMain.handle("sec:startup", () => callBackend("GET", "/api/sec/startup"));

  // --- boot manager (modulo 11) ---
  ipcMain.handle("boot:list", () => callBackend("GET", "/api/boot/list"));
  ipcMain.handle("boot:set", (_e, p: { name: string; kind: string; scope: string; enable: boolean }) =>
    callBackend("POST", "/api/boot/set", p)
  );

  // --- analise de disco (modulo 14) ---
  ipcMain.handle("disk:roots", () => callBackend("GET", "/api/disk/roots"));
  ipcMain.handle("disk:tree", (_e, path: string) => callBackend("POST", "/api/disk/tree", { path }));
  ipcMain.handle("disk:large", (_e, path: string) => callBackend("POST", "/api/disk/large", { path }));
  ipcMain.handle("disk:duplicates", (_e, path: string) =>
    callBackend("POST", "/api/disk/duplicates", { path })
  );
  ipcMain.handle("disk:smart", () => callBackend("GET", "/api/disk/smart"));
  // --- auto-updater (modulo 19) ---
  ipcMain.handle("updater:check", () => checkForUpdate());
  ipcMain.handle("updater:download", () => triggerUpdateCheck(true));
  ipcMain.handle("updater:open", (_e, url: string) => {
    if (typeof url === "string" && /^https:\/\/github\.com\//.test(url)) shell.openExternal(url);
    return { ok: true };
  });

  // --- relatorios PDF/HTML (modulo 18) ---
  ipcMain.handle("report:save", async (_e, opts: { html: string; format: "pdf" | "html" }) => {
    try {
      const dir = path.join(app.getPath("documents"), "NexusClean-Reports");
      mkdirSync(dir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

      if (opts.format === "html") {
        const file = path.join(dir, `relatorio-${stamp}.html`);
        writeFileSync(file, opts.html, "utf8");
        shell.showItemInFolder(file);
        return { ok: true, path: file };
      }

      // PDF: renderiza o HTML numa janela invisivel e imprime em PDF
      const tmp = path.join(app.getPath("temp"), `nexus-report-${Date.now()}.html`);
      writeFileSync(tmp, opts.html, "utf8");
      const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
      await win.loadFile(tmp);
      const pdf = await win.webContents.printToPDF({ printBackground: true });
      win.destroy();
      try { unlinkSync(tmp); } catch {}
      const file = path.join(dir, `relatorio-${stamp}.pdf`);
      writeFileSync(file, pdf);
      shell.showItemInFolder(file);
      return { ok: true, path: file };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? "falha ao gerar relatorio" };
    }
  });

  ipcMain.handle("shell:reveal", (_e, p: string) => {
    try {
      shell.showItemInFolder(p);
    } catch {}
    return { ok: true };
  });

  // --- backup & restauracao (modulo 13) ---
  ipcMain.handle("restore:points", () => callBackend("GET", "/api/restore/points"));
  ipcMain.handle("restore:backups", () => callBackend("GET", "/api/restore/backups"));
  ipcMain.handle("restore:apply", (_e, seq: number) => {
    if (!Number.isInteger(seq) || seq <= 0) return { ok: false, message: "ponto invalido" };
    try {
      // Restore-Computer reinicia a maquina e reverte o sistema.
      spawn(
        "powershell.exe",
        ["-NoProfile", "-Command", `Restore-Computer -RestorePoint ${seq}`],
        { detached: true, windowsHide: true }
      ).unref();
      return { ok: true, message: "Restaurando... o computador vai reiniciar." };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? "falha" };
    }
  });

  // --- notificacoes nativas + log de eventos (modulo 16) ---
  ipcMain.handle("notify:show", (_e, p: { title: string; body: string }) => {
    notify(p.title, p.body);
    return { ok: true };
  });
  ipcMain.on("tray:action", (_e, id: string) => handleTrayAction(id));

  const logPath = () => path.join(app.getPath("userData"), "events.json");
  const readLog = (): any[] => {
    try {
      return existsSync(logPath()) ? JSON.parse(readFileSync(logPath(), "utf8")) : [];
    } catch {
      return [];
    }
  };
  ipcMain.handle("log:add", (_e, ev: { type: string; detail: string }) => {
    const list = readLog();
    list.unshift({ time: new Date().toISOString(), type: ev.type, detail: ev.detail });
    try {
      writeFileSync(logPath(), JSON.stringify(list.slice(0, 200)));
    } catch {}
    return { ok: true };
  });
  ipcMain.handle("log:list", () => ({ ok: true, data: readLog() }));
  ipcMain.handle("log:clear", () => {
    try {
      writeFileSync(logPath(), "[]");
    } catch {}
    return { ok: true };
  });

  ipcMain.handle(
    "task:start",
    (_e, opts: { kind?: TaskKind; driversOnly?: boolean; scanOnly?: boolean; actions?: string }) => {
      startTask(opts?.kind ?? "update", !!opts?.driversOnly, !!opts?.scanOnly, opts?.actions ?? "");
      return { ok: true };
    }
  );
  ipcMain.handle("task:stop", () => {
    stopTask();
    return { ok: true };
  });

  ipcMain.handle("app:relaunchAsAdmin", () => {
    if (isDev) {
      return { ok: false, message: "Disponivel apenas no aplicativo instalado." };
    }
    try {
      spawn(
        "powershell.exe",
        ["-Command", `Start-Process -FilePath '${process.execPath}' -Verb RunAs`],
        { detached: true, windowsHide: true }
      ).unref();
      setTimeout(() => app.quit(), 400);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? "falha" };
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: "#050a07",
    title: "NexusClean",
    show: false,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  // So exibe quando o conteudo esta pronto; entao encerra a splash.
  mainWindow.once("ready-to-show", () => {
    closeSplash();
    mainWindow?.show();
  });

  // Recuperacao contra "tela preta": se o renderer travar/morrer, recarrega.
  mainWindow.webContents.on("render-process-gone", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try { mainWindow.reload(); } catch {}
    }
  });
  mainWindow.webContents.on("unresponsive", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try { mainWindow.webContents.reloadIgnoringCache(); } catch {}
    }
  });
  // Escotilha manual: F5 (ou Ctrl+R) recarrega o painel caso ele fique preto.
  mainWindow.webContents.on("before-input-event", (_e, input) => {
    if (input.type !== "keyDown") return;
    const key = (input.key || "").toLowerCase();
    if (key === "f5" || (input.control && key === "r")) {
      try { mainWindow?.webContents.reloadIgnoringCache(); } catch {}
    }
  });

  mainWindow.on("maximize", () => mainWindow?.webContents.send("win:maximized", true));
  mainWindow.on("unmaximize", () => mainWindow?.webContents.send("win:maximized", false));

  // Fechar (X) esconde para a bandeja em vez de encerrar o app.
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
      if (!hiddenNoticeShown) {
        hiddenNoticeShown = true;
        notify("NexusClean continua rodando", "O app foi minimizado para a bandeja. Clique no icone para reabrir ou use Sair.");
      }
    }
  });
}

app.whenReady().then(async () => {
  // Garante privilegio de administrador (reabre elevado se necessario)
  if (!ensureAdmin()) {
    app.quit();
    return;
  }
  Menu.setApplicationMenu(null); // remove a barra File/Edit/View padrao
  createSplash(); // aparece imediatamente, enquanto o backend sobe
  registerIpc();
  try {
    await startBackend();
  } catch (e) {
    console.error("Erro ao iniciar backend:", e);
  }
  createWindow();
  createTray();

  // verifica atualizacoes no boot (baixa/instala sozinho se houver)
  setTimeout(() => triggerUpdateCheck(false), 8000);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  // Com a bandeja ativa, so encerra de fato quando o usuario escolhe "Sair".
  if (!isQuitting) return;
  if (backend) backend.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (backend) backend.kill();
});
