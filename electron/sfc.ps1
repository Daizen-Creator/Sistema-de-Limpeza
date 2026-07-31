# =====================================================================
#  VERIFICACAO DE INTEGRIDADE DO SISTEMA (SFC + DISM RestoreHealth)
# =====================================================================
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
function Step($m){ Write-Output "[*] $m"; Start-Sleep -Milliseconds 200 }
function Ok($m){ Write-Output "[+] $m" }
function Item($m){ Write-Output "[>] $m" }
function Bad($m){ Write-Output "[ERR] $m" }

Write-Output "==============================================================="
Write-Output "   VERIFICACAO DE INTEGRIDADE :: DANIEL SANTOS CIRIACO"
Write-Output "==============================================================="

$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$pr = New-Object Security.Principal.WindowsPrincipal($id)
if (-not $pr.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Bad "Requer administrador. Reabra o app como administrador."
  Write-Output "STATUS::ERROR::0::false"
  return
}

$reboot = $false
Step "Reparando imagem do Windows (DISM RestoreHealth)..."
Item "Isso pode levar varios minutos, aguarde..."
$d = Start-Process -FilePath "DISM.exe" -ArgumentList "/Online","/Cleanup-Image","/RestoreHealth" -NoNewWindow -Wait -PassThru
if ($d.ExitCode -eq 0) { Ok "Imagem do Windows integra" } else { Item "DISM codigo $($d.ExitCode)" }

Step "Verificando arquivos do sistema (SFC /scannow)..."
Item "Aguarde, verificacao completa em andamento..."
$s = Start-Process -FilePath "sfc.exe" -ArgumentList "/scannow" -NoNewWindow -Wait -PassThru
switch ($s.ExitCode) {
  0 { Ok "Nenhuma violacao de integridade encontrada" }
  default { Item "SFC concluido (codigo $($s.ExitCode)). Detalhes em CBS.log" }
}

Write-Output "[OK] VERIFICACAO CONCLUIDA"
Write-Output "STATUS::DONE::0::$reboot"
