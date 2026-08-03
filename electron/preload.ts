import { contextBridge, ipcRenderer } from "electron";

/**
 * Ponte segura entre o renderer e o processo principal.
 * O renderer NAO tem acesso a Node nem a rede; so a estes metodos.
 */
const api = {
  systemInfo: () => ipcRenderer.invoke("system:info"),
  cleanScan: () => ipcRenderer.invoke("clean:scan"),
  cleanRun: (ids: string[]) => ipcRenderer.invoke("clean:run", ids),
  driversList: () => ipcRenderer.invoke("drivers:list"),
  driversScan: () => ipcRenderer.invoke("drivers:scan"),
  driversInstall: (titles: string[]) => ipcRenderer.invoke("drivers:install", titles),
  isElevated: () => ipcRenderer.invoke("app:isElevated"),
  openWindowsUpdate: () => ipcRenderer.invoke("app:openWindowsUpdate"),

  // --- hardware / processos / rede ---
  hwInfo: () => ipcRenderer.invoke("hw:info"),
  procList: () => ipcRenderer.invoke("proc:list"),
  procKill: (pid: number) => ipcRenderer.invoke("proc:kill", pid),
  procPriority: (pid: number, level: string) => ipcRenderer.invoke("proc:priority", { pid, level }),
  netStats: () => ipcRenderer.invoke("net:stats"),

  // --- menu de bandeja customizado ---
  trayAction: (id: string) => ipcRenderer.send("tray:action", id),

  // --- controles da janela ---
  winMinimize: () => ipcRenderer.invoke("win:minimize"),
  winMaximize: () => ipcRenderer.invoke("win:maximize"),
  winClose: () => ipcRenderer.invoke("win:close"),
  winIsMaximized: () => ipcRenderer.invoke("win:isMaximized"),
  onMaximizeChange: (cb: (max: boolean) => void) => {
    const h = (_e: unknown, max: boolean) => cb(max);
    ipcRenderer.on("win:maximized", h);
    return () => ipcRenderer.removeListener("win:maximized", h);
  },

  // --- agendamento de limpeza ---
  scheduleStatus: () => ipcRenderer.invoke("schedule:status"),
  scheduleCreate: (opts: { day?: string; time?: string }) => ipcRenderer.invoke("schedule:create", opts),
  scheduleRemove: () => ipcRenderer.invoke("schedule:remove"),

  // --- seguranca (modulo 6) ---
  secStatus: () => ipcRenderer.invoke("sec:status"),
  secTelemetry: (on: boolean) => ipcRenderer.invoke("sec:telemetry", on),
  secFirewall: (profile: string, on: boolean) => ipcRenderer.invoke("sec:firewall", { profile, on }),
  secServices: () => ipcRenderer.invoke("sec:services"),
  secServiceSet: (name: string, action: string) => ipcRenderer.invoke("sec:serviceSet", { name, action }),
  secStartup: () => ipcRenderer.invoke("sec:startup"),

  // --- notificacoes + log de eventos (modulo 16) ---
  notify: (title: string, body: string) => ipcRenderer.invoke("notify:show", { title, body }),
  logAdd: (type: string, detail: string) => ipcRenderer.invoke("log:add", { type, detail }),
  logList: () => ipcRenderer.invoke("log:list"),
  logClear: () => ipcRenderer.invoke("log:clear"),

  // --- auto-updater (modulo 19) ---
  updaterCheck: () => ipcRenderer.invoke("updater:check"),
  updaterOpen: (url: string) => ipcRenderer.invoke("updater:open", url),
  updaterDownload: () => ipcRenderer.invoke("updater:download"),

  // --- relatorios (modulo 18) ---
  reportSave: (html: string, format: "pdf" | "html") =>
    ipcRenderer.invoke("report:save", { html, format }),

  // --- sensores (modulo 17) ---
  sensors: () => ipcRenderer.invoke("sensors:read"),

  // --- terminal integrado (modulo 20) ---
  termRun: (command: string) => ipcRenderer.invoke("term:run", command),

  // --- rede avancada (modulo 9) ---
  netProcesses: () => ipcRenderer.invoke("net:processes"),
  netPing: (host: string, count: number) => ipcRenderer.invoke("net:ping", { host, count }),

  // --- boot manager (modulo 11) ---
  bootList: () => ipcRenderer.invoke("boot:list"),
  bootSet: (name: string, kind: string, scope: string, enable: boolean) =>
    ipcRenderer.invoke("boot:set", { name, kind, scope, enable }),

  // --- analise de disco (modulo 14) ---
  diskRoots: () => ipcRenderer.invoke("disk:roots"),
  diskTree: (path: string) => ipcRenderer.invoke("disk:tree", path),
  diskLarge: (path: string) => ipcRenderer.invoke("disk:large", path),
  diskDuplicates: (path: string) => ipcRenderer.invoke("disk:duplicates", path),
  diskSmart: () => ipcRenderer.invoke("disk:smart"),
  revealInExplorer: (path: string) => ipcRenderer.invoke("shell:reveal", path),

  // --- backup & restauracao (modulo 13) ---
  restorePoints: () => ipcRenderer.invoke("restore:points"),
  restoreBackups: () => ipcRenderer.invoke("restore:backups"),
  restoreApply: (seq: number) => ipcRenderer.invoke("restore:apply", seq),

  // --- tarefas com streaming ---
  startTask: (opts: {
    kind:
      | "update" | "optimize" | "hacker" | "advopt" | "sfc" | "backup" | "profile"
      | "restorepoint" | "revert" | "trace";
    driversOnly?: boolean;
    scanOnly?: boolean;
    actions?: string;
  }) => ipcRenderer.invoke("task:start", opts),
  stopTask: () => ipcRenderer.invoke("task:stop"),
  relaunchAsAdmin: () => ipcRenderer.invoke("app:relaunchAsAdmin"),

  onUpdateLog: (cb: (line: string) => void) => {
    const h = (_e: unknown, line: string) => cb(line);
    ipcRenderer.on("update:log", h);
    return () => ipcRenderer.removeListener("update:log", h);
  },
  onUpdateDone: (cb: (r: { status: string; count: number; reboot: boolean }) => void) => {
    const h = (_e: unknown, r: any) => cb(r);
    ipcRenderer.on("update:done", h);
    return () => ipcRenderer.removeListener("update:done", h);
  },
  onUpdateExit: (cb: () => void) => {
    const h = () => cb();
    ipcRenderer.on("update:exit", h);
    return () => ipcRenderer.removeListener("update:exit", h);
  },
};

contextBridge.exposeInMainWorld("api", api);

export type Api = typeof api;
