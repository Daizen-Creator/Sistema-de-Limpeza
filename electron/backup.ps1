# =====================================================================
#  BACKUP RAPIDO :: drivers atuais + chaves de registro criticas
#  Salva em Documentos\NexusClean-Backup\<data-hora>
# =====================================================================
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
function Step($m){ Write-Output "[*] $m"; Start-Sleep -Milliseconds 200 }
function Ok($m){ Write-Output "[+] $m" }
function Item($m){ Write-Output "[>] $m" }
function Bad($m){ Write-Output "[ERR] $m" }

Write-Output "==============================================================="
Write-Output "   BACKUP DE SEGURANCA :: DANIEL SANTOS CIRIACO"
Write-Output "==============================================================="

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dest  = Join-Path $env:USERPROFILE ("Documents\NexusClean-Backup\" + $stamp)
$drv   = Join-Path $dest "Drivers"
New-Item -ItemType Directory -Path $drv -Force | Out-Null
Ok "Pasta de backup: $dest"

# --- Drivers ---
Step "Exportando drivers de terceiros (pnputil)..."
Item "Pode levar um tempo dependendo da quantidade..."
try {
  pnputil /export-driver * "$drv" | Out-Null
  $n = (Get-ChildItem $drv -Directory -ErrorAction SilentlyContinue).Count
  Ok "Drivers exportados ($n pacote(s))"
} catch { Bad "Falha ao exportar drivers (requer administrador)" }

# --- Registro (chaves que o app pode alterar) ---
Step "Exportando chaves de registro criticas (.reg)..."
$keys = @{
  "Run-HKCU"       = "HKCU\Software\Microsoft\Windows\CurrentVersion\Run"
  "Run-HKLM"       = "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
  "GraphicsDrivers"= "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
  "VisualEffects"  = "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
  "GameBar"        = "HKCU\Software\Microsoft\GameBar"
}
foreach ($k in $keys.Keys) {
  $file = Join-Path $dest ("$k.reg")
  reg export $keys[$k] "$file" /y 2>$null | Out-Null
  if (Test-Path $file) { Item "salvo: $k.reg" }
}
Ok "Registro exportado"

Write-Output "[OK] BACKUP CONCLUIDO em $dest"
Write-Output "STATUS::DONE::0::false"
