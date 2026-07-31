# =====================================================================
#  PERFIS DE USO :: Game / Work / Battery  (modulo 15)
#  Ajustes seguros e reversiveis. Recebe -Profile game|work|battery
# =====================================================================
param([string]$Profile = "game")

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
function Step($m){ Write-Output "[*] $m"; Start-Sleep -Milliseconds 200 }
function Ok($m){ Write-Output "[+] $m" }
function Item($m){ Write-Output "[>] $m" }
function Bad($m){ Write-Output "[ERR] $m" }

$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$pr = New-Object Security.Principal.WindowsPrincipal($id)
$admin = $pr.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

Write-Output "==============================================================="
Write-Output "   PERFIL DE USO :: DANIEL SANTOS CIRIACO"
Write-Output "==============================================================="

function Free-Ram {
  try {
    $sig = '[DllImport("psapi.dll")] public static extern bool EmptyWorkingSet(IntPtr hProcess);'
    $api = Add-Type -MemberDefinition $sig -Name "MemApiP" -Namespace "Win32Pf" -PassThru -ErrorAction Stop
    Get-Process | ForEach-Object { try { [void]$api::EmptyWorkingSet($_.Handle) } catch {} }
    Ok "Memoria RAM liberada"
  } catch { Item "Nao foi possivel liberar RAM" }
}

switch ($Profile) {
  "game" {
    Write-Output "   >> MODO GAME ATIVADO"
    Step "Ativando plano de ALTO DESEMPENHO..."
    powercfg -setactive SCHEME_MIN | Out-Null; Ok "CPU/GPU em desempenho maximo"
    Step "Ativando Modo Jogo do Windows..."
    $gb = "HKCU:\Software\Microsoft\GameBar"; New-Item -Path $gb -Force | Out-Null
    Set-ItemProperty -Path $gb -Name "AutoGameModeEnabled" -Value 1 -Type DWord
    Set-ItemProperty -Path $gb -Name "AllowAutoGameMode" -Value 1 -Type DWord
    Ok "Game Mode ativado"
    Step "Liberando memoria para o jogo..."; Free-Ram
    if ($admin) {
      Step "Pausando atualizacoes em segundo plano..."
      Stop-Service wuauserv -Force -ErrorAction SilentlyContinue
      Stop-Service BITS -Force -ErrorAction SilentlyContinue
      Ok "Windows Update pausado temporariamente"
    } else { Item "Pausar updates requer admin" }
    Step "Otimizando rede..."; ipconfig /flushdns | Out-Null; Ok "Cache DNS limpo"
    Write-Output "[OK] MODO GAME PRONTO :: bom jogo!"
  }
  "work" {
    Write-Output "   >> MODO TRABALHO ATIVADO"
    Step "Definindo energia como EQUILIBRADO..."
    powercfg -setactive SCHEME_BALANCED | Out-Null; Ok "Energia equilibrada"
    Step "Restaurando servicos de produtividade..."
    if ($admin) {
      Set-Service WSearch -StartupType Automatic -ErrorAction SilentlyContinue
      Start-Service WSearch -ErrorAction SilentlyContinue
      Start-Service wuauserv -ErrorAction SilentlyContinue
      Ok "Busca do Windows e atualizacoes ativas"
    } else { Item "Restaurar servicos requer admin" }
    Step "Restaurando efeitos visuais..."
    $ve = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
    New-Item -Path $ve -Force | Out-Null
    Set-ItemProperty -Path $ve -Name "VisualFXSetting" -Value 0 -Type DWord
    Ok "Aparencia equilibrada"
    Write-Output "[OK] MODO TRABALHO PRONTO"
  }
  "battery" {
    Write-Output "   >> MODO ECONOMIA (BATERIA) ATIVADO"
    Step "Definindo energia como ECONOMIA..."
    powercfg -setactive SCHEME_MAX | Out-Null; Ok "Plano economico (clock reduzido)"
    Step "Reduzindo brilho da tela..."
    try {
      $m = Get-WmiObject -Namespace root/wmi -Class WmiMonitorBrightnessMethods -ErrorAction Stop
      $m.WmiSetBrightness(1, 40) | Out-Null
      Ok "Brilho reduzido para 40%"
    } catch { Item "Ajuste de brilho indisponivel (nao e notebook?)" }
    if ($admin) {
      Step "Desativando servicos pesados..."
      Stop-Service SysMain -Force -ErrorAction SilentlyContinue
      Ok "SysMain pausado"
    }
    Step "Liberando memoria..."; Free-Ram
    Write-Output "[OK] MODO ECONOMIA PRONTO"
  }
  default { Bad "Perfil desconhecido: $Profile" }
}

Write-Output "STATUS::DONE::1::false"
