# =====================================================================
#  PONTO DE RESTAURACAO DO SISTEMA (modulo 13.1)
#  Habilita a Protecao do Sistema e cria um ponto de restauracao.
# =====================================================================
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
function Step($m){ Write-Output "[*] $m"; Start-Sleep -Milliseconds 200 }
function Ok($m){ Write-Output "[+] $m" }
function Item($m){ Write-Output "[>] $m" }
function Bad($m){ Write-Output "[ERR] $m" }

Write-Output "==============================================================="
Write-Output "   PONTO DE RESTAURACAO :: DANIEL SANTOS CIRIACO"
Write-Output "==============================================================="

$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$pr = New-Object Security.Principal.WindowsPrincipal($id)
if (-not $pr.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Bad "Requer administrador. Reabra o app como administrador."
  Write-Output "STATUS::ERROR::0::false"
  return
}

$drive = "$env:SystemDrive\"
Step "Habilitando Protecao do Sistema em $drive ..."
try { Enable-ComputerRestore -Drive $drive -ErrorAction Stop; Ok "Protecao do sistema ativa" }
catch { Item "Protecao ja ativa ou indisponivel" }

Step "Liberando criacao frequente de pontos..."
try {
  New-Item -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore" -Force | Out-Null
  Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore" -Name "SystemRestorePointCreationFrequency" -Value 0 -Type DWord
  Ok "Ok"
} catch {}

$desc = "NexusClean " + (Get-Date -Format "yyyy-MM-dd HH:mm")
Step "Criando ponto de restauracao: $desc"
Item "Isso pode levar de 30s a alguns minutos..."
try {
  Checkpoint-Computer -Description $desc -RestorePointType "MODIFY_SETTINGS" -ErrorAction Stop
  Ok "Ponto de restauracao criado com sucesso!"
} catch {
  Bad ("Falha: " + $_.Exception.Message)
  Write-Output "STATUS::ERROR::0::false"
  return
}

Write-Output "[OK] PRONTO :: voce pode reverter para este ponto quando quiser"
Write-Output "STATUS::DONE::1::false"
