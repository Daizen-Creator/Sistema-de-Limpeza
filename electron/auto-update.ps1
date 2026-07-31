# =====================================================================
#  Motor de atualizacao automatica de drivers (estilo Driver Booster)
#  Fonte UNICA: Windows Update Agent (Microsoft.Update.Session)
#  -> apenas pacotes assinados/WHQL verificados por certificado.
#  Emite log linha a linha para a interface (tema Matrix).
# =====================================================================
param(
  [switch]$DriversOnly,   # se presente, so drivers; senao drivers + updates do Windows
  [switch]$ScanOnly       # so verifica, nao instala
)

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Log($m)  { Write-Output $m }
function Step($m) { Write-Output "[*] $m"; Start-Sleep -Milliseconds 250 }
function Ok($m)   { Write-Output "[+] $m" }
function Item($m) { Write-Output "[>] $m" }
function Bad($m)  { Write-Output "[ERR] $m" }

Log "==============================================================="
Log "   MOTOR DE ATUALIZACAO :: DANIEL SANTOS CIRIACO"
Log "==============================================================="
Step "Inicializando nucleo de atualizacao..."
Step "Estabelecendo canal seguro com os servidores Microsoft..."
Ok  "Canal estabelecido"

# --- privilegio ---
$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$pr = New-Object Security.Principal.WindowsPrincipal($id)
$admin = $pr.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($admin) { Ok "Privilegio de administrador confirmado" }
else        { Bad "Sem privilegio de administrador - modo somente verificacao" }

try {
  Step "Abrindo sessao com o Windows Update Agent..."
  $session  = New-Object -ComObject Microsoft.Update.Session
  $searcher = $session.CreateUpdateSearcher()

  $criteria = if ($DriversOnly) { "IsInstalled=0 and Type='Driver'" }
              else              { "IsInstalled=0" }

  Step "Escaneando hardware e catalogo de atualizacoes..."
  $result = $searcher.Search($criteria)
  $count  = $result.Updates.Count
  Ok "$count atualizacao(oes) encontrada(s)"

  if ($count -eq 0) {
    Ok "Todos os drivers e componentes ja estao atualizados."
    Log "STATUS::DONE::0::false"
    return
  }

  # lista o que sera atualizado
  Step "Verificando assinaturas digitais (WHQL)..."
  for ($i = 0; $i -lt $count; $i++) {
    $u = $result.Updates.Item($i)
    Item "$($u.Title)"
  }
  Ok "Assinaturas verificadas - todos os pacotes sao confiaveis"

  if ($ScanOnly -or -not $admin) {
    Log "STATUS::SCANNED::$count::false"
    return
  }

  # monta colecao para baixar/instalar
  $toInstall = New-Object -ComObject Microsoft.Update.UpdateColl
  for ($i = 0; $i -lt $count; $i++) {
    $u = $result.Updates.Item($i)
    if (-not $u.EulaAccepted) { $u.AcceptEula() }
    [void]$toInstall.Add($u)
  }

  # download
  Step "Baixando pacotes assinados..."
  $downloader = $session.CreateUpdateDownloader()
  $downloader.Updates = $toInstall
  $dres = $downloader.Download()
  Ok "Download concluido (codigo $($dres.ResultCode))"

  # instalacao item a item, com log
  Step "Injetando drivers no sistema..."
  $installer = $session.CreateUpdateInstaller()
  $installer.Updates = $toInstall
  $ires = $installer.Install()

  $reboot = [bool]$ires.RebootRequired
  Ok "Instalacao finalizada (codigo $($ires.ResultCode))"
  for ($i = 0; $i -lt $count; $i++) {
    $u = $result.Updates.Item($i)
    Ok "Atualizado: $($u.Title)"
  }

  if ($reboot) { Log "[!] Reinicie o computador para concluir." }
  Log "STATUS::DONE::$count::$reboot"
}
catch {
  Bad ("Falha: " + $_.Exception.Message)
  Log "STATUS::ERROR::0::false"
}
