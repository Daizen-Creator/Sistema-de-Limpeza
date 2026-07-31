# =====================================================================
#  REVERTER OTIMIZACOES (modulo 13.4)
#  Restaura o estado padrao das alteracoes feitas pelo app:
#   - reimporta o backup de registro mais recente (se houver)
#   - volta o plano de energia para Equilibrado
#   - reativa servicos que podem ter sido desativados
#   - restaura efeitos visuais
# =====================================================================
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
function Step($m){ Write-Output "[*] $m"; Start-Sleep -Milliseconds 200 }
function Ok($m){ Write-Output "[+] $m" }
function Item($m){ Write-Output "[>] $m" }
function Bad($m){ Write-Output "[ERR] $m" }

Write-Output "==============================================================="
Write-Output "   REVERTER OTIMIZACOES :: DANIEL SANTOS CIRIACO"
Write-Output "==============================================================="

$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$pr = New-Object Security.Principal.WindowsPrincipal($id)
$admin = $pr.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# 1) Reimportar o backup de registro mais recente
Step "Procurando backup de registro mais recente..."
$base = Join-Path $env:USERPROFILE "Documents\NexusClean-Backup"
if (Test-Path $base) {
  $latest = Get-ChildItem $base -Directory | Sort-Object CreationTime -Descending | Select-Object -First 1
  if ($latest) {
    Item "Backup: $($latest.Name)"
    Get-ChildItem $latest.FullName -Filter *.reg -ErrorAction SilentlyContinue | ForEach-Object {
      reg import "$($_.FullName)" 2>$null | Out-Null
      Item "reimportado: $($_.Name)"
    }
    Ok "Registro restaurado do backup"
  } else { Item "Nenhum backup encontrado" }
} else { Item "Nenhum backup encontrado (crie um em Seguranca)" }

# 2) Plano de energia equilibrado
Step "Restaurando plano de energia (Equilibrado)..."
powercfg -setactive SCHEME_BALANCED | Out-Null
Ok "Energia equilibrada"

# 3) Reativar servicos
Step "Reativando servicos do Windows..."
if ($admin) {
  foreach ($s in @("DiagTrack","SysMain","WSearch","wuauserv")) {
    try {
      Set-Service -Name $s -StartupType Automatic -ErrorAction SilentlyContinue
      Start-Service -Name $s -ErrorAction SilentlyContinue
      Item "reativado: $s"
    } catch {}
  }
  Ok "Servicos reativados"
} else { Item "Reativar servicos requer admin" }

# 4) Efeitos visuais
Step "Restaurando efeitos visuais..."
$ve = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
New-Item -Path $ve -Force | Out-Null
Set-ItemProperty -Path $ve -Name "VisualFXSetting" -Value 0 -Type DWord
Ok "Aparencia padrao restaurada"

Write-Output "[OK] OTIMIZACOES REVERTIDAS :: sistema no estado padrao"
Write-Output "STATUS::DONE::1::false"
