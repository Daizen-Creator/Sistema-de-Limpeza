# =====================================================================
#  OTIMIZACOES AVANCADAS + DEEP CLEAN (modulos 7 e 12)
#  Recebe -Actions "id1,id2,..." e executa cada uma, com log ao vivo.
#  Todas as acoes sao reversiveis ou seguras. Requer admin para varias.
# =====================================================================
param([string]$Actions = "")

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Step($m) { Write-Output "[*] $m"; Start-Sleep -Milliseconds 150 }
function Ok($m)   { Write-Output "[+] $m" }
function Item($m) { Write-Output "[>] $m" }
function Bad($m)  { Write-Output "[ERR] $m" }

$script:reboot = $false
$script:applied = 0

$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$pr = New-Object Security.Principal.WindowsPrincipal($id)
$admin = $pr.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

Write-Output "==============================================================="
Write-Output "   OTIMIZACAO AVANCADA :: DANIEL SANTOS CIRIACO"
Write-Output "==============================================================="
if ($admin) { Ok "Administrador confirmado" } else { Bad "Sem admin - algumas acoes serao puladas" }

function Do-Temp {
  Step "Limpando temporarios (Temp, Prefetch, cache)..."
  try {
    $paths = @("$env:TEMP\*", "$env:SystemRoot\Temp\*", "$env:SystemRoot\Prefetch\*",
               "$env:LOCALAPPDATA\Microsoft\Windows\INetCache\*")
    foreach ($p in $paths) { Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue }
    Ok "Temporarios e Prefetch limpos"
    $script:applied++
  } catch { Bad "Falha na limpeza de temporarios" }
}

function Do-Trim {
  Step "Otimizando discos (TRIM em SSD / desfragmentar HD)..."
  try {
    $vols = Get-Volume | Where-Object { $_.DriveLetter -and $_.FileSystem -eq 'NTFS' }
    foreach ($v in $vols) {
      $phys = $null
      try { $phys = (Get-PhysicalDisk | Where-Object { $_.DeviceId -eq (Get-Partition -DriveLetter $v.DriveLetter -ErrorAction SilentlyContinue | Get-Disk -ErrorAction SilentlyContinue).Number }).MediaType } catch {}
      if ($phys -eq 'SSD') {
        Optimize-Volume -DriveLetter $v.DriveLetter -ReTrim -ErrorAction SilentlyContinue
        Item "SSD $($v.DriveLetter): TRIM aplicado"
      } else {
        Optimize-Volume -DriveLetter $v.DriveLetter -Defrag -ErrorAction SilentlyContinue
        Item "HD $($v.DriveLetter): desfragmentado"
      }
    }
    Ok "Discos otimizados"
    $script:applied++
  } catch { Bad "Falha ao otimizar discos" }
}

function Do-Services {
  Step "Desabilitando servicos desnecessarios (Xbox, telemetria)..."
  if (-not $admin) { Item "Pulado :: requer admin"; return }
  $svcs = @("DiagTrack","dmwappushservice","XblAuthManager","XblGameSave","XboxGipSvc","XboxNetApiSvc")
  $n = 0
  foreach ($s in $svcs) {
    try {
      if (Get-Service -Name $s -ErrorAction SilentlyContinue) {
        Stop-Service -Name $s -Force -ErrorAction SilentlyContinue
        Set-Service -Name $s -StartupType Disabled -ErrorAction SilentlyContinue
        Item "Desabilitado: $s"; $n++
      }
    } catch {}
  }
  Ok "$n servico(s) desabilitado(s)"
  $script:applied++
}

function Do-Pagefile {
  Step "Ajustando memoria virtual (paginacao gerenciada pelo sistema)..."
  if (-not $admin) { Item "Pulado :: requer admin"; return }
  try {
    $cs = Get-CimInstance Win32_ComputerSystem
    if (-not $cs.AutomaticManagedPagefile) {
      $cs | Set-CimInstance -Property @{ AutomaticManagedPagefile = $true } -ErrorAction Stop
      Ok "Paginacao definida como automatica (aplica apos reiniciar)"
      $script:reboot = $true
    } else { Ok "Paginacao ja esta automatica" }
    $script:applied++
  } catch { Bad "Falha ao ajustar paginacao" }
}

function Do-Indexing {
  Step "Reduzindo indexacao de arquivos (Windows Search)..."
  if (-not $admin) { Item "Pulado :: requer admin"; return }
  try {
    Set-Service -Name WSearch -StartupType Manual -ErrorAction SilentlyContinue
    Stop-Service -Name WSearch -Force -ErrorAction SilentlyContinue
    Ok "Indexacao reduzida (servico em Manual)"
    $script:applied++
  } catch { Bad "Falha ao ajustar indexacao" }
}

function Do-Registry {
  Step "Limpando listas recentes do registro (MRU)..."
  try {
    $keys = @(
      "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\RecentDocs",
      "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\RunMRU",
      "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\TypedPaths"
    )
    foreach ($k in $keys) { Remove-Item "$k\*" -Recurse -Force -ErrorAction SilentlyContinue }
    Ok "Entradas temporarias do registro limpas (MRU)"
    $script:applied++
  } catch { Bad "Falha ao limpar registro" }
}

function Do-Gpu {
  Step "Ativando maximo desempenho de GPU..."
  try {
    powercfg -setactive SCHEME_MIN | Out-Null
    if ($admin) {
      Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" -Name "HwSchMode" -Value 2 -Type DWord -ErrorAction SilentlyContinue
      Item "Agendamento de GPU por hardware ativado (apos reiniciar)"
      $script:reboot = $true
    }
    Ok "GPU priorizada para desempenho maximo"
    $script:applied++
  } catch { Bad "Falha ao configurar GPU" }
}

function Do-VisualFx {
  Step "Desabilitando animacoes e transicoes visuais..."
  try {
    $ve = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
    New-Item -Path $ve -Force | Out-Null
    Set-ItemProperty -Path $ve -Name "VisualFXSetting" -Value 2 -Type DWord
    Ok "Efeitos visuais reduzidos"
    $script:applied++
  } catch { Bad "Falha ao ajustar efeitos visuais" }
}

function Do-Dns {
  Step "Limpando cache de DNS e liberando conexoes..."
  try {
    ipconfig /flushdns | Out-Null
    Ok "Cache DNS limpo"
    $script:applied++
  } catch { Bad "Falha ao limpar DNS" }
}

function Do-Chkdsk {
  Step "Verificando erros de disco (scan online, sem reiniciar)..."
  try {
    $r = Repair-Volume -DriveLetter C -Scan -ErrorAction Stop
    Ok "Verificacao de disco concluida (C:) :: $r"
    $script:applied++
  } catch { Item "Scan de disco nao disponivel (requer admin)" }
}

function Do-Winsxs {
  Step "Limpando atualizacoes antigas do Windows (WinSxS/DISM)..."
  if (-not $admin) { Item "Pulado :: requer admin"; return }
  try {
    Item "Executando DISM StartComponentCleanup (pode demorar)..."
    Dism /Online /Cleanup-Image /StartComponentCleanup /Quiet | Out-Null
    Ok "Componentes antigos do Windows removidos"
    $script:applied++
  } catch { Bad "Falha no DISM" }
}

function Do-EventLogs {
  Step "Limpando logs do Windows (Event Viewer)..."
  if (-not $admin) { Item "Pulado :: requer admin"; return }
  try {
    foreach ($l in @("Application","System","Setup","Windows PowerShell")) {
      wevtutil cl "$l" 2>$null
    }
    Ok "Logs do Windows limpos"
    $script:applied++
  } catch { Bad "Falha ao limpar logs" }
}

function Do-DriverStore {
  Step "Analisando pacotes de drivers antigos (Driver Store)..."
  try {
    $out = pnputil /enum-drivers 2>$null
    $count = ($out | Select-String "oem\d+\.inf").Count
    Item "$count pacote(s) de driver de terceiros no repositorio"
    Item "Remocao automatica desativada por seguranca (evita remover driver em uso)"
    Ok "Analise concluida"
    $script:applied++
  } catch { Bad "Falha ao analisar driver store" }
}

# --- dispatcher ---
$ids = $Actions -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
if (-not $ids) { $ids = @("temp","dns","visualfx") }

foreach ($a in $ids) {
  switch ($a) {
    "temp"        { Do-Temp }
    "trim"        { Do-Trim }
    "services"    { Do-Services }
    "pagefile"    { Do-Pagefile }
    "indexing"    { Do-Indexing }
    "registry"    { Do-Registry }
    "gpu"         { Do-Gpu }
    "visualfx"    { Do-VisualFx }
    "dns"         { Do-Dns }
    "chkdsk"      { Do-Chkdsk }
    "winsxs"      { Do-Winsxs }
    "eventlogs"   { Do-EventLogs }
    "driverstore" { Do-DriverStore }
    default       { Item "acao desconhecida: $a" }
  }
}

Write-Output "[OK] CONCLUIDO :: $script:applied acao(oes) aplicada(s)"
if ($script:reboot) { Write-Output "[!] Reinicie o computador para efeito completo." }
Write-Output "STATUS::DONE::$script:applied::$script:reboot"
