# =====================================================================
#  TURBO FPS :: Otimizador de desempenho (ajustes seguros e reversiveis)
#  Emite log linha a linha para a interface (tema Matrix).
# =====================================================================
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Step($m) { Write-Output "[*] $m"; Start-Sleep -Milliseconds 220 }
function Ok($m)   { Write-Output "[+] $m" }
function Item($m) { Write-Output "[>] $m" }
function Bad($m)  { Write-Output "[ERR] $m" }

Write-Output "==============================================================="
Write-Output "   TURBO FPS :: OTIMIZADOR :: DANIEL SANTOS CIRIACO"
Write-Output "==============================================================="

$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$pr = New-Object Security.Principal.WindowsPrincipal($id)
$admin = $pr.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

$applied = 0
$reboot  = $false

# 1) Plano de energia de alto desempenho
Step "Analisando plano de energia..."
try {
  powercfg -setactive SCHEME_MIN | Out-Null
  Ok "Plano de ALTO DESEMPENHO ativado"
  $applied++
} catch { Bad "Nao foi possivel alterar o plano de energia" }

# 2) Liberar memoria RAM (EmptyWorkingSet)
Step "Liberando memoria RAM em cache..."
try {
  $os = Get-CimInstance Win32_OperatingSystem
  $freeBefore = [int]($os.FreePhysicalMemory / 1024)
  $sig = '[DllImport("psapi.dll")] public static extern bool EmptyWorkingSet(IntPtr hProcess);'
  $api = Add-Type -MemberDefinition $sig -Name "MemApi" -Namespace "Win32Nx" -PassThru -ErrorAction Stop
  Get-Process | ForEach-Object {
    try { [void]$api::EmptyWorkingSet($_.Handle) } catch {}
  }
  Start-Sleep -Milliseconds 400
  $os2 = Get-CimInstance Win32_OperatingSystem
  $freeAfter = [int]($os2.FreePhysicalMemory / 1024)
  $delta = [math]::Max(0, $freeAfter - $freeBefore)
  Ok ("RAM liberada :: +{0} MB (livre: {1} MB)" -f $delta, $freeAfter)
  $applied++
} catch { Bad "Falha ao liberar RAM" }

# 3) Modo Jogo (Game Mode) - HKCU (nao exige admin)
Step "Ativando Modo Jogo do Windows..."
try {
  $gb = "HKCU:\Software\Microsoft\GameBar"
  New-Item -Path $gb -Force | Out-Null
  Set-ItemProperty -Path $gb -Name "AllowAutoGameMode" -Value 1 -Type DWord
  Set-ItemProperty -Path $gb -Name "AutoGameModeEnabled" -Value 1 -Type DWord
  Ok "Game Mode ATIVADO"
  $applied++
} catch { Bad "Falha ao ativar Game Mode" }

# 4) Efeitos visuais para desempenho - HKCU
Step "Otimizando efeitos visuais para desempenho..."
try {
  $ve = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
  New-Item -Path $ve -Force | Out-Null
  Set-ItemProperty -Path $ve -Name "VisualFXSetting" -Value 2 -Type DWord
  Ok "Animacoes reduzidas :: resposta mais rapida"
  $applied++
} catch { Bad "Falha ao ajustar efeitos visuais" }

# 5) Prioridade de GPU (agendamento por hardware) - HKLM, exige admin + reboot
Step "Configurando prioridade de GPU..."
if ($admin) {
  try {
    $gd = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
    Set-ItemProperty -Path $gd -Name "HwSchMode" -Value 2 -Type DWord -ErrorAction Stop
    Ok "Agendamento de GPU por hardware ATIVADO (efeito apos reiniciar)"
    $reboot = $true
    $applied++
  } catch { Bad "Falha ao configurar GPU" }
} else {
  Item "Pulado :: requer administrador"
}

# 6) Otimizar rede (flush DNS)
Step "Limpando cache de rede (DNS)..."
try {
  ipconfig /flushdns | Out-Null
  Ok "Cache DNS limpo :: latencia reduzida"
  $applied++
} catch { Bad "Falha ao limpar DNS" }

Write-Output "[OK] TURBO ATIVADO :: $applied otimizacao(oes) aplicada(s)"
if ($reboot) { Write-Output "[!] Reinicie para ativar a prioridade de GPU." }
Write-Output "STATUS::DONE::$applied::$reboot"
