// Tipos compartilhados expostos ao renderer via preload.

export interface CleanItem {
  id: string;
  label: string;
  description: string;
  requiresAdmin: boolean;
  bytes: number;
}

export interface CleanResult {
  id: string;
  freedBytes: number;
  note: string;
}

export interface DriverInfo {
  deviceName: string;
  manufacturer: string;
  deviceClass: string;
  driverVersion: string;
  isSigned: boolean;
  driverDate: string;
}

export interface DriverUpdate {
  title: string;
  manufacturer: string;
  model: string;
  driverClass: string;
  driverDate: string;
  sizeBytes: number;
  signed: boolean;
}

export interface SystemInfo {
  ok: boolean;
  os: string;
  user: string;
  javaVersion: string;
  elevated: boolean;
  diskTotalBytes: number;
  diskFreeBytes: number;
  computerName: string;
}

export interface ApiShape {
  systemInfo(): Promise<SystemInfo>;
  cleanScan(): Promise<{ ok: boolean; items: CleanItem[] }>;
  cleanRun(ids: string[]): Promise<{ ok: boolean; totalFreedBytes: number; results: CleanResult[] }>;
  driversList(): Promise<{ ok: boolean; data: DriverInfo[] }>;
  driversScan(): Promise<{ ok: boolean; data: DriverUpdate[] }>;
  driversInstall(titles: string[]): Promise<{
    ok: boolean;
    installed?: number;
    rebootRequired?: boolean;
    needsAdmin?: boolean;
    message?: string;
  }>;
  isElevated(): Promise<boolean>;
  openWindowsUpdate(): Promise<{ ok: boolean }>;

  hwInfo(): Promise<{ ok: boolean; data: HardwareInfo }>;
  procList(): Promise<{ ok: boolean; data: ProcInfo[] }>;
  procKill(pid: number): Promise<{ ok: boolean; message?: string }>;
  procPriority(pid: number, level: string): Promise<{ ok: boolean; message?: string }>;
  netStats(): Promise<{ ok: boolean; data: NetStats }>;

  winMinimize(): Promise<void>;
  winMaximize(): Promise<boolean>;
  winClose(): Promise<void>;
  winIsMaximized(): Promise<boolean>;
  onMaximizeChange(cb: (max: boolean) => void): () => void;

  scheduleStatus(): Promise<{ ok: boolean; enabled: boolean }>;
  scheduleCreate(opts: { day?: string; time?: string }): Promise<{ ok: boolean; message?: string }>;
  scheduleRemove(): Promise<{ ok: boolean; message?: string }>;

  secStatus(): Promise<{ ok: boolean; data: SecurityStatus }>;
  secTelemetry(on: boolean): Promise<{ ok: boolean; message?: string }>;
  secFirewall(profile: string, on: boolean): Promise<{ ok: boolean; message?: string }>;
  secServices(): Promise<{ ok: boolean; data: ServiceInfo[] }>;
  secServiceSet(name: string, action: string): Promise<{ ok: boolean; message?: string }>;
  secStartup(): Promise<{ ok: boolean; data: StartupInfo[] }>;

  notify(title: string, body: string): Promise<{ ok: boolean }>;
  logAdd(type: string, detail: string): Promise<{ ok: boolean }>;
  logList(): Promise<{ ok: boolean; data: EventLog[] }>;
  logClear(): Promise<{ ok: boolean }>;

  updaterCheck(): Promise<UpdateCheck>;
  updaterOpen(url: string): Promise<{ ok: boolean }>;
  updaterDownload(): Promise<void>;

  reportSave(html: string, format: "pdf" | "html"): Promise<{ ok: boolean; path?: string; message?: string }>;

  sensors(): Promise<{ ok: boolean; data?: SensorData; message?: string }>;
  termRun(command: string): Promise<{ ok: boolean; code?: number; output?: string; message?: string }>;

  netProcesses(): Promise<{ ok: boolean; data: NetProc[] }>;
  netPing(host: string, count: number): Promise<{ ok: boolean; data?: PingResult; message?: string }>;

  bootList(): Promise<{ ok: boolean; data: BootItem[] }>;
  bootSet(name: string, kind: string, scope: string, enable: boolean): Promise<{ ok: boolean; message?: string }>;

  diskRoots(): Promise<{ ok: boolean; drives: DiskDrive[]; folders: DiskFolder[] }>;
  diskTree(path: string): Promise<DiskTree>;
  diskLarge(path: string): Promise<{ ok: boolean; items: DiskFile[] }>;
  diskDuplicates(path: string): Promise<{ ok: boolean; wastedBytes: number; groups: DupGroup[] }>;
  diskSmart(): Promise<{ ok: boolean; data: SmartDisk[] }>;
  revealInExplorer(path: string): Promise<{ ok: boolean }>;

  restorePoints(): Promise<{ ok: boolean; data: RestorePoint[] }>;
  restoreBackups(): Promise<{ ok: boolean; data: BackupInfo[] }>;
  restoreApply(seq: number): Promise<{ ok: boolean; message?: string }>;

  startTask(opts: {
    kind:
      | "update" | "optimize" | "hacker" | "advopt" | "sfc" | "backup" | "profile"
      | "restorepoint" | "revert" | "trace";
    driversOnly?: boolean;
    scanOnly?: boolean;
    actions?: string;
  }): Promise<{ ok: boolean }>;
  stopTask(): Promise<{ ok: boolean }>;
  relaunchAsAdmin(): Promise<{ ok: boolean; message?: string }>;
  onUpdateLog(cb: (line: string) => void): () => void;
  onUpdateDone(cb: (r: UpdateDone) => void): () => void;
  onUpdateExit(cb: () => void): () => void;
}

export interface UpdateDone {
  status: string; // DONE | SCANNED | ERROR
  count: number;
  reboot: boolean;
}

export interface DiskInfo { name: string; media: string; sizeBytes: number; }
export interface VolInfo { drive: string; totalBytes: number; freeBytes: number; }
export interface HardwareInfo {
  cpuName: string; cpuCores: number; cpuThreads: number; cpuClockMhz: number;
  cpuLoad: number; cpuTempC: number | null;
  gpuName: string; gpuDriver: string; gpuVramBytes: number;
  motherboard: string;
  ramTotalBytes: number; ramFreeBytes: number;
  disks: DiskInfo[]; volumes: VolInfo[];
}
export interface ProcInfo { pid: number; name: string; ramMB: number; cpuSec: number; }
export interface FirewallProfile { name: string; enabled: boolean; }
export interface SecurityStatus { telemetryOn: boolean; firewall: FirewallProfile[]; }
export interface ServiceInfo { name: string; display: string; status: string; startup: string; }
export interface StartupInfo { name: string; command: string; location: string; user: string; }
export interface EventLog { time: string; type: string; detail: string; }
export interface UpdateCheck {
  ok: boolean; current: string; latest?: string | null;
  hasUpdate?: boolean; url?: string; message?: string;
}
export interface CoreLoad { core: number; load: number; }
export interface FanInfo { name: string; speed: number; }
export interface SensorData {
  cpuName: string; cpuClock: number; cpuMaxClock: number; cpuLoad: number;
  voltage: number; tempC: number; cores: CoreLoad[]; fans: FanInfo[];
}
export interface NetProc { pid: number; name: string; connections: number; remotes: string; }
export interface PingResult {
  host: string; sent: number; received: number; lossPct: number;
  minMs: number; avgMs: number; maxMs: number;
}
export interface BootItem {
  name: string; command: string; scope: string; kind: string;
  enabled: boolean; impact: string;
}
export interface DiskDrive { path: string; totalBytes: number; freeBytes: number; }
export interface DiskFolder { label: string; path: string; }
export interface DiskEntry { name: string; path: string; bytes: number; isDir: boolean; }
export interface DiskTree {
  ok: boolean; path: string; parent: string | null;
  totalBytes: number; truncated: boolean; items: DiskEntry[];
}
export interface DiskFile { name: string; path: string; bytes: number; }
export interface DupGroup { bytes: number; count: number; files: string[]; }
export interface SmartDisk {
  name: string; media: string; health: string; sizeBytes: number;
  wear: number; tempC: number; powerOnHours: number;
}
export interface RestorePoint { seq: number; description: string; date: string; type: string; }
export interface BackupInfo { name: string; date: string; sizeBytes: number; }
export interface NetStats {
  pingGoogle: number; pingCloudflare: number; rxBytes: number; txBytes: number;
}

declare global {
  interface Window {
    api: ApiShape;
  }
}

export {};
