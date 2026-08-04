import type { ApiShape } from "../../electron/types";

/**
 * Acesso a API do backend.
 *
 * Dentro do Electron, usa window.api (ponte segura do preload).
 * Fora do Electron (ex.: preview no navegador), cai para dados simulados,
 * para que a interface possa ser visualizada sem o backend.
 */
const hasNative = typeof window !== "undefined" && (window as any).api;

export const isNative = !!hasNative;

const mock: ApiShape = {
  async systemInfo() {
    return {
      ok: true,
      os: "Windows 10 (demonstracao)",
      user: "usuario",
      javaVersion: "21",
      elevated: false,
      diskTotalBytes: 512 * 1024 ** 3,
      diskFreeBytes: 143 * 1024 ** 3,
      computerName: "DEMO-PC",
    };
  },
  async cleanScan() {
    return {
      ok: true,
      items: [
        { id: "temp_user", label: "Arquivos temporarios do usuario", description: "Pasta %TEMP% da sua conta.", requiresAdmin: false, bytes: 1_191_621_949 },
        { id: "temp_windows", label: "Arquivos temporarios do Windows", description: "Pasta C:\\Windows\\Temp.", requiresAdmin: true, bytes: 340_000_000 },
        { id: "recycle_bin", label: "Lixeira", description: "Esvazia a Lixeira do Windows.", requiresAdmin: false, bytes: 2_277_521_704 },
        { id: "windows_update_cache", label: "Cache do Windows Update", description: "Instaladores ja aplicados.", requiresAdmin: true, bytes: 2_473_408 },
        { id: "delivery_optimization", label: "Cache de Otimizacao de Entrega", description: "Arquivos de distribuicao de updates.", requiresAdmin: true, bytes: 0 },
      ],
    };
  },
  async cleanRun(ids) {
    return { ok: true, totalFreedBytes: 3_400_000_000, results: ids.map((id) => ({ id, freedBytes: 500_000_000, note: "ok" })) };
  },
  async driversList() {
    return {
      ok: true,
      data: [
        { deviceName: "NVIDIA GeForce RTX 3060", manufacturer: "NVIDIA", deviceClass: "Display", driverVersion: "31.0.15.3623", isSigned: true, driverDate: "2025-11-02" },
        { deviceName: "Realtek High Definition Audio", manufacturer: "Realtek", deviceClass: "MEDIA", driverVersion: "6.0.9563.1", isSigned: true, driverDate: "2025-06-14" },
        { deviceName: "Intel(R) Wi-Fi 6 AX200", manufacturer: "Intel", deviceClass: "Net", driverVersion: "22.240.0.6", isSigned: true, driverDate: "2025-09-01" },
      ],
    };
  },
  async driversScan() {
    return {
      ok: true,
      data: [
        { title: "NVIDIA - Display - 32.0.15.6070", manufacturer: "NVIDIA", model: "GeForce RTX 3060", driverClass: "Display", driverDate: "2026-05-20", sizeBytes: 890_000_000, signed: true },
        { title: "Intel - Net - 23.10.0.5", manufacturer: "Intel", model: "Wi-Fi 6 AX200", driverClass: "Net", driverDate: "2026-04-11", sizeBytes: 42_000_000, signed: true },
      ],
    };
  },
  async driversInstall() {
    return { ok: false, needsAdmin: true, message: "Modo demonstracao: instalacao real ocorre apenas no aplicativo com administrador." };
  },
  async isElevated() {
    return false;
  },
  async openWindowsUpdate() {
    return { ok: true };
  },
  async hwInfo() {
    return {
      ok: true,
      data: {
        cpuName: "AMD Ryzen 5 4600G (demo)",
        cpuCores: 6, cpuThreads: 12, cpuClockMhz: 3700, cpuLoad: 23, cpuTempC: 52,
        gpuName: "NVIDIA GeForce GTX 1050 Ti", gpuDriver: "32.0.15.8253", gpuVramBytes: 4 * 1024 ** 3,
        motherboard: "MANCER A320M-DA (demo)",
        ramTotalBytes: 8 * 1024 ** 3, ramFreeBytes: 2.7 * 1024 ** 3,
        disks: [
          { name: "KINGSTON SA400S37120G", media: "SSD", sizeBytes: 120 * 1024 ** 3 },
          { name: "TOSHIBA MQ01ABF050", media: "HDD", sizeBytes: 500 * 1024 ** 3 },
        ],
        volumes: [
          { drive: "C:", totalBytes: 119 * 1024 ** 3, freeBytes: 11 * 1024 ** 3 },
          { drive: "D:", totalBytes: 240 * 1024 ** 3, freeBytes: 199 * 1024 ** 3 },
        ],
      },
    };
  },
  async procList() {
    return {
      ok: true,
      data: [
        { pid: 1010, name: "chrome", ramMB: 512.3, cpuSec: 125.6 },
        { pid: 2020, name: "Code", ramMB: 277.2, cpuSec: 217.7 },
        { pid: 3030, name: "OneDrive.Sync.Service", ramMB: 216.6, cpuSec: 2862 },
        { pid: 4040, name: "explorer", ramMB: 141.2, cpuSec: 88.1 },
        { pid: 5050, name: "steam", ramMB: 132.9, cpuSec: 40.2 },
      ],
    };
  },
  async procKill() {
    return { ok: false, message: "Modo demonstracao: encerrar processo so no app instalado." };
  },
  async procPriority() {
    return { ok: false, message: "Modo demonstracao." };
  },
  async netStats() {
    return {
      ok: true,
      data: {
        pingGoogle: 9 + Math.round(Math.random() * 6),
        pingCloudflare: 4 + Math.round(Math.random() * 5),
        rxBytes: Date.now() * 120 % 5e10 + Math.random() * 2e6,
        txBytes: Date.now() * 40 % 2e10 + Math.random() * 5e5,
      },
    };
  },

  async secStatus() {
    return {
      ok: true,
      data: {
        telemetryOn: true,
        firewall: [
          { name: "Domain", enabled: true },
          { name: "Private", enabled: true },
          { name: "Public", enabled: true },
        ],
      },
    };
  },
  async secTelemetry() { return { ok: false, message: "Modo demonstracao." }; },
  async secFirewall() { return { ok: false, message: "Modo demonstracao." }; },
  async secServices() {
    return {
      ok: true,
      data: [
        { name: "DiagTrack", display: "Telemetria e Experiencias Conectadas", status: "Running", startup: "Automatic" },
        { name: "SysMain", display: "SysMain (Superfetch)", status: "Running", startup: "Automatic" },
        { name: "WSearch", display: "Windows Search", status: "Running", startup: "Automatic" },
        { name: "XblAuthManager", display: "Xbox Live Auth Manager", status: "Stopped", startup: "Manual" },
      ],
    };
  },
  async secServiceSet() { return { ok: false, message: "Modo demonstracao." }; },
  async secStartup() {
    return {
      ok: true,
      data: [
        { name: "OneDrive", command: "OneDrive.exe /background", location: "HKCU\\...\\Run", user: "demo" },
        { name: "Steam", command: "steam.exe -silent", location: "HKCU\\...\\Run", user: "demo" },
      ],
    };
  },

  async updaterCheck() {
    return { ok: true, current: "1.0.0", latest: "1.0.0", hasUpdate: false, url: "https://github.com/Daizen-Creator/Sistema-de-Limpeza/releases" };
  },
  async updaterOpen() { return { ok: true }; },
  async updaterDownload() { /* demo */ },

  async reportSave() {
    return { ok: false, message: "Modo demonstracao: gerar relatorio so no app instalado." };
  },

  async sensors() {
    return {
      ok: true,
      data: {
        cpuName: "AMD Ryzen 5 4600G (demo)", cpuClock: 3701, cpuMaxClock: 3701, cpuLoad: 42,
        voltage: 1.2, tempC: 52,
        cores: Array.from({ length: 12 }, (_, i) => ({ core: i, load: Math.round(20 + Math.random() * 60) })),
        fans: [],
      },
    };
  },
  async termRun(command: string) {
    return { ok: true, code: 0, output: `PS demo> ${command}\n(saida real so no app instalado)\n` };
  },

  async netProcesses() {
    return {
      ok: true,
      data: [
        { pid: 1111, name: "chrome", connections: 12, remotes: "142.250.0.1:443, 35.190.80.1:443" },
        { pid: 2222, name: "RobloxPlayerBeta", connections: 8, remotes: "128.116.86.3:443" },
        { pid: 3333, name: "Discord", connections: 5, remotes: "162.159.128.233:443" },
        { pid: 4444, name: "OneDrive", connections: 3, remotes: "13.107.42.12:443" },
      ],
    };
  },
  async netPing(host: string) {
    return {
      ok: true,
      data: { host, sent: 4, received: 4, lossPct: 0, minMs: 11, avgMs: 14, maxMs: 18 },
    };
  },

  async bootList() {
    return {
      ok: true,
      data: [
        { name: "OneDrive", command: "OneDrive.exe /background", scope: "usuario", kind: "registry", enabled: true, impact: "Alto" },
        { name: "Steam", command: "steam.exe -silent", scope: "usuario", kind: "registry", enabled: true, impact: "Alto" },
        { name: "Docker Desktop", command: "Docker Desktop.exe", scope: "usuario", kind: "registry", enabled: true, impact: "Alto" },
        { name: "RobloxPlayerBeta", command: "RobloxPlayerBeta.exe", scope: "usuario", kind: "registry", enabled: false, impact: "Baixo" },
        { name: "NVIDIA App", command: "nvidia.exe", scope: "sistema", kind: "registry", enabled: true, impact: "Medio" },
      ],
    };
  },
  async bootSet() { return { ok: false, message: "Modo demonstracao." }; },

  async diskRoots() {
    return {
      ok: true,
      drives: [
        { path: "C:\\", totalBytes: 119 * 1024 ** 3, freeBytes: 8 * 1024 ** 3 },
        { path: "D:\\", totalBytes: 240 * 1024 ** 3, freeBytes: 195 * 1024 ** 3 },
        { path: "E:\\", totalBytes: 500 * 1024 ** 3, freeBytes: 428 * 1024 ** 3 },
      ],
      folders: [
        { label: "Usuario", path: "C:\\Users\\demo" },
        { label: "Downloads", path: "C:\\Users\\demo\\Downloads" },
        { label: "Documentos", path: "C:\\Users\\demo\\Documents" },
      ],
    };
  },
  async diskTree(path: string) {
    return {
      ok: true, path, parent: "C:\\Users\\demo", totalBytes: 42 * 1024 ** 3, truncated: false,
      items: [
        { name: "node_modules", path: path + "\\node_modules", bytes: 22 * 1024 ** 3, isDir: true },
        { name: "Videos", path: path + "\\Videos", bytes: 12 * 1024 ** 3, isDir: true },
        { name: "backup.zip", path: path + "\\backup.zip", bytes: 5 * 1024 ** 3, isDir: false },
        { name: "fotos", path: path + "\\fotos", bytes: 3 * 1024 ** 3, isDir: true },
      ],
    };
  },
  async diskLarge() {
    return {
      ok: true,
      items: [
        { name: "filme-4k.mkv", path: "C:\\Users\\demo\\Videos\\filme-4k.mkv", bytes: 8 * 1024 ** 3 },
        { name: "backup.zip", path: "C:\\Users\\demo\\backup.zip", bytes: 5 * 1024 ** 3 },
        { name: "jogo.iso", path: "D:\\ISOs\\jogo.iso", bytes: 3.5 * 1024 ** 3 },
      ],
    };
  },
  async diskDuplicates() {
    return {
      ok: true, wastedBytes: 2.4 * 1024 ** 3,
      groups: [
        { bytes: 1.2 * 1024 ** 3, count: 2, files: ["C:\\a\\video.mp4", "C:\\b\\video.mp4"] },
        { bytes: 600 * 1024 ** 2, count: 3, files: ["C:\\x\\img.png", "C:\\y\\img.png", "C:\\z\\img.png"] },
      ],
    };
  },
  async diskSmart() {
    return {
      ok: true,
      data: [
        { name: "KINGSTON SA400S37120G", media: "SSD", health: "Healthy", sizeBytes: 120 * 1024 ** 3, wear: 8, tempC: 34, powerOnHours: 4200 },
        { name: "TOSHIBA MQ01ABF050", media: "HDD", health: "Healthy", sizeBytes: 500 * 1024 ** 3, wear: -1, tempC: 38, powerOnHours: 15200 },
      ],
    };
  },
  async revealInExplorer() { return { ok: true }; },

  async restorePoints() {
    return {
      ok: true,
      data: [
        { seq: 42, description: "NexusClean 2026-07-30 14:30", date: "2026-07-30 14:30", type: "MODIFY_SETTINGS" },
        { seq: 41, description: "Windows Update", date: "2026-07-28 03:12", type: "APPLICATION_INSTALL" },
      ],
    };
  },
  async restoreBackups() {
    return {
      ok: true,
      data: [
        { name: "20260730-143012", date: "2026-07-30 14:30", sizeBytes: 340 * 1024 ** 2 },
      ],
    };
  },
  async restoreApply() {
    return { ok: false, message: "Modo demonstracao: restauracao real so no app instalado." };
  },

  async notify() { return { ok: true }; },
  async logAdd(type: string, detail: string) {
    mockLog.unshift({ time: new Date().toISOString(), type, detail });
    return { ok: true };
  },
  async logList() { return { ok: true, data: mockLog }; },
  async logClear() { mockLog.length = 0; return { ok: true }; },

  async winMinimize() {},
  async winMaximize() { return false; },
  async winClose() {},
  async winIsMaximized() { return false; },
  onMaximizeChange() { return () => {}; },

  async scheduleStatus() {
    return { ok: true, enabled: false };
  },
  async scheduleCreate() {
    return { ok: true, message: "Modo demonstracao: agendamento real no app instalado." };
  },
  async scheduleRemove() {
    return { ok: true };
  },

  // --- simulacao cinematografica para o modo demonstracao ---
  async startTask(opts) {
    if (mockRunning) return { ok: true }; // evita disparo duplicado (StrictMode)
    if (mockTimer) clearInterval(mockTimer);
    mockRunning = true;
    const seq =
      opts.kind === "advopt"
        ? buildAdvoptSeq(opts.actions ?? "")
        : opts.kind === "profile"
        ? PROFILE_SEQ[opts.actions ?? "game"] ?? PROFILE_SEQ.game
        : MOCK_SEQ[opts.kind] ?? MOCK_SEQ.update;
    let i = 0;
    mockTimer = setInterval(() => {
      if (i < seq.length) {
        emit("log", seq[i++]);
      } else {
        if (mockTimer) clearInterval(mockTimer);
        mockTimer = null;
        mockRunning = false;
        emit("done", { status: "DONE", count: seq.length, reboot: false });
        emit("exit", undefined);
      }
    }, 300);
    return { ok: true };
  },
  async stopTask() {
    if (mockTimer) clearInterval(mockTimer);
    mockTimer = null;
    mockRunning = false;
    return { ok: true };
  },
  async relaunchAsAdmin() {
    return { ok: false, message: "Modo demonstracao: elevacao ocorre no app instalado." };
  },
  onUpdateLog(cb) {
    return subscribe("log", cb);
  },
  onUpdateDone(cb) {
    return subscribe("done", cb);
  },
  onUpdateExit(cb) {
    return subscribe("exit", cb);
  },
};

// sequencias simuladas por tipo de tarefa (modo demonstracao)
const MOCK_SEQ: Record<string, string[]> = {
  update: [
    "===============================================================",
    "   MOTOR DE ATUALIZACAO :: DANIEL SANTOS CIRIACO",
    "===============================================================",
    "[*] Inicializando nucleo de atualizacao...",
    "[*] Estabelecendo canal seguro com os servidores Microsoft...",
    "[+] Canal criptografado estabelecido (TLS 1.3)",
    "[*] Escaneando dispositivos de hardware...",
    "[>] GPU ... NVIDIA GeForce RTX 3060",
    "[>] REDE .. Intel Wi-Fi 6 AX200",
    "[*] Verificando assinaturas digitais (WHQL)...",
    "[+] 2 driver(es) desatualizado(s) detectado(s)",
    "[>] Baixando NVIDIA 32.0.15.6070 ...",
    "[+] Assinatura verificada :: CONFIAVEL",
    "[+] Atualizado: NVIDIA GeForce RTX 3060",
    "[+] Atualizado: Intel Wi-Fi 6 AX200",
    "[+] Sistema sincronizado com o catalogo Microsoft",
  ],
  optimize: [
    "===============================================================",
    "   TURBO FPS :: OTIMIZADOR DE DESEMPENHO",
    "===============================================================",
    "[*] Analisando gargalos de desempenho...",
    "[>] Plano de energia atual: Equilibrado",
    "[*] Ativando plano de ALTO DESEMPENHO...",
    "[+] CPU liberada para frequencia maxima",
    "[*] Liberando memoria RAM em cache...",
    "[+] 1.8 GB de RAM liberados",
    "[*] Encerrando processos em segundo plano...",
    "[+] 7 processos desnecessarios encerrados",
    "[*] Ativando Modo Jogo do Windows...",
    "[+] Game Mode ATIVADO",
    "[*] Priorizando GPU para jogos...",
    "[+] Agendamento de GPU por hardware ATIVADO",
    "[*] Otimizando efeitos visuais para desempenho...",
    "[+] Animacoes reduzidas :: resposta mais rapida",
    "[*] Limpando cache de rede (DNS)...",
    "[+] Latencia reduzida",
    "[✓] TURBO ATIVADO :: ganho estimado de FPS aplicado",
  ],
  trace: [
    "===============================================================",
    "   TRACEROUTE :: google.com :: DANIEL SANTOS CIRIACO",
    "===============================================================",
    "[*] Mapeando a rota ate o destino (max 20 saltos)...",
    "[>]  1    <1 ms  192.168.0.1",
    "[>]  2    12 ms  100.64.0.1",
    "[>]  3    14 ms  187.100.20.1",
    "[>]  4    15 ms  142.250.0.1",
    "[OK] ROTA MAPEADA :: 4 salto(s) ate o destino",
  ],
  sfc: [
    "===============================================================",
    "   VERIFICACAO DE INTEGRIDADE :: DANIEL SANTOS CIRIACO",
    "===============================================================",
    "[*] Reparando imagem do Windows (DISM RestoreHealth)...",
    "[>] Isso pode levar varios minutos, aguarde...",
    "[+] Imagem do Windows integra",
    "[*] Verificando arquivos do sistema (SFC /scannow)...",
    "[>] Aguarde, verificacao completa em andamento...",
    "[+] Nenhuma violacao de integridade encontrada",
    "[OK] VERIFICACAO CONCLUIDA",
  ],
  restorepoint: [
    "===============================================================",
    "   PONTO DE RESTAURACAO :: DANIEL SANTOS CIRIACO",
    "===============================================================",
    "[*] Habilitando Protecao do Sistema...",
    "[+] Protecao do sistema ativa",
    "[*] Criando ponto de restauracao...",
    "[>] Isso pode levar de 30s a alguns minutos...",
    "[+] Ponto de restauracao criado com sucesso!",
    "[OK] PRONTO :: voce pode reverter para este ponto quando quiser",
  ],
  revert: [
    "===============================================================",
    "   REVERTER OTIMIZACOES :: DANIEL SANTOS CIRIACO",
    "===============================================================",
    "[*] Procurando backup de registro mais recente...",
    "[>] reimportado: Run-HKCU.reg",
    "[+] Registro restaurado do backup",
    "[+] Energia equilibrada",
    "[+] Servicos reativados",
    "[+] Aparencia padrao restaurada",
    "[OK] OTIMIZACOES REVERTIDAS :: sistema no estado padrao",
  ],
  backup: [
    "===============================================================",
    "   BACKUP DE SEGURANCA :: DANIEL SANTOS CIRIACO",
    "===============================================================",
    "[+] Pasta de backup: Documentos\\NexusClean-Backup",
    "[*] Exportando drivers de terceiros (pnputil)...",
    "[+] Drivers exportados (12 pacotes)",
    "[*] Exportando chaves de registro criticas (.reg)...",
    "[>] salvo: Run-HKCU.reg",
    "[>] salvo: GraphicsDrivers.reg",
    "[+] Registro exportado",
    "[OK] BACKUP CONCLUIDO",
  ],
  hacker: [
    "===============================================================",
    "   MODO HACKER :: VARREDURA DO SISTEMA",
    "===============================================================",
    "[*] Acessando nucleo do sistema...",
    "[+] Acesso concedido :: root@nexus",
    "[*] Mapeando interfaces de rede...",
    "[>] IPv4 local .... 192.168.0.14",
    "[>] Gateway ....... 192.168.0.1",
    "[>] MAC ........... 8C:1D:96:xx:xx:xx",
    "[*] Escaneando portas abertas...",
    "[+] 3 conexoes ativas mapeadas",
    "[*] Enumerando processos em execucao...",
    "[+] 142 processos identificados",
    "[*] Verificando escudo do sistema (Defender)...",
    "[+] Protecao em tempo real :: ATIVA",
    "[*] Auditando integridade dos drivers...",
    "[+] Nenhuma anomalia detectada",
    "[✓] VARREDURA CONCLUIDA :: sistema integro",
  ],
};

// rotulos das acoes avancadas (para o log simulado)
const ADVOPT_LABELS: Record<string, string> = {
  temp: "Limpando temporarios (Temp, Prefetch, cache)...",
  trim: "Otimizando discos (TRIM em SSD / desfragmentar HD)...",
  services: "Desabilitando servicos desnecessarios (Xbox, telemetria)...",
  pagefile: "Ajustando memoria virtual (paginacao)...",
  indexing: "Reduzindo indexacao de arquivos...",
  registry: "Limpando listas recentes do registro (MRU)...",
  gpu: "Ativando maximo desempenho de GPU...",
  visualfx: "Desabilitando animacoes e transicoes visuais...",
  dns: "Limpando cache de DNS...",
  chkdsk: "Verificando erros de disco (scan online)...",
  winsxs: "Limpando atualizacoes antigas (WinSxS/DISM)...",
  eventlogs: "Limpando logs do Windows...",
  driverstore: "Analisando pacotes de drivers antigos...",
};

function buildAdvoptSeq(actions: string): string[] {
  const ids = actions.split(",").map((s) => s.trim()).filter(Boolean);
  const seq = [
    "===============================================================",
    "   OTIMIZACAO AVANCADA :: DANIEL SANTOS CIRIACO",
    "===============================================================",
    "[+] Administrador confirmado",
  ];
  for (const id of ids) {
    seq.push("[*] " + (ADVOPT_LABELS[id] ?? id));
    seq.push("[+] Concluido: " + id);
  }
  seq.push("[OK] CONCLUIDO :: " + ids.length + " acao(oes) aplicada(s)");
  return seq;
}

const PROFILE_SEQ: Record<string, string[]> = {
  game: [
    "===============================================================",
    "   PERFIL DE USO :: DANIEL SANTOS CIRIACO",
    "   >> MODO GAME ATIVADO",
    "[*] Ativando plano de ALTO DESEMPENHO...",
    "[+] CPU/GPU em desempenho maximo",
    "[+] Game Mode ativado",
    "[+] Memoria RAM liberada",
    "[+] Windows Update pausado temporariamente",
    "[+] Cache DNS limpo",
    "[OK] MODO GAME PRONTO :: bom jogo!",
  ],
  work: [
    "===============================================================",
    "   PERFIL DE USO :: DANIEL SANTOS CIRIACO",
    "   >> MODO TRABALHO ATIVADO",
    "[*] Definindo energia como EQUILIBRADO...",
    "[+] Energia equilibrada",
    "[+] Busca do Windows e atualizacoes ativas",
    "[+] Aparencia equilibrada",
    "[OK] MODO TRABALHO PRONTO",
  ],
  battery: [
    "===============================================================",
    "   PERFIL DE USO :: DANIEL SANTOS CIRIACO",
    "   >> MODO ECONOMIA (BATERIA) ATIVADO",
    "[*] Definindo energia como ECONOMIA...",
    "[+] Plano economico (clock reduzido)",
    "[+] Brilho reduzido para 40%",
    "[+] SysMain pausado",
    "[+] Memoria RAM liberada",
    "[OK] MODO ECONOMIA PRONTO",
  ],
};

// mini event-bus para o mock
let mockRunning = false;
let mockTimer: ReturnType<typeof setInterval> | null = null;
const mockLog: { time: string; type: string; detail: string }[] = [];
type Ev = "log" | "done" | "exit";
const listeners: Record<Ev, Set<(p: any) => void>> = { log: new Set(), done: new Set(), exit: new Set() };
function subscribe(ev: Ev, cb: (p: any) => void) {
  listeners[ev].add(cb);
  return () => listeners[ev].delete(cb);
}
function emit(ev: Ev, payload: any) {
  listeners[ev].forEach((cb) => cb(payload));
}

export const api: ApiShape = hasNative ? (window as any).api : mock;
