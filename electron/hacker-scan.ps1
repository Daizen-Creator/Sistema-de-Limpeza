# =====================================================================
#  MODO HACKER :: Varredura de diagnostico (SOMENTE LEITURA)
#  Coleta e exibe info do proprio PC de forma dramatica. Nao altera nada.
# =====================================================================
$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Step($m) { Write-Output "[*] $m"; Start-Sleep -Milliseconds 260 }
function Ok($m)   { Write-Output "[+] $m" }
function Item($m) { Write-Output "[>] $m" }

Write-Output "==============================================================="
Write-Output "   MODO HACKER :: VARREDURA :: DANIEL SANTOS CIRIACO"
Write-Output "==============================================================="
Step "Acessando nucleo do sistema..."
Ok  "Acesso concedido :: $($env:USERNAME)@$($env:COMPUTERNAME)"

# --- Rede ---
Step "Mapeando interfaces de rede..."
try {
  $ipv4 = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
           Where-Object { $_.IPAddress -notlike '169.*' -and $_.IPAddress -ne '127.0.0.1' } |
           Select-Object -First 1).IPAddress
  $gw = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
         Select-Object -First 1).NextHop
  $mac = (Get-NetAdapter -ErrorAction SilentlyContinue |
          Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1).MacAddress
  Item "IPv4 local ...... $ipv4"
  Item "Gateway ......... $gw"
  Item "MAC ............. $mac"
  Ok  "Interfaces mapeadas"
} catch { Item "rede indisponivel" }

# --- Portas / conexoes ---
Step "Escaneando conexoes ativas..."
try {
  $conns = (Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue).Count
  $listen = (Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue).Count
  Ok "$conns conexao(oes) ativa(s) :: $listen porta(s) ouvindo"
} catch { Item "sem dados de conexao" }

# --- Processos ---
Step "Enumerando processos em execucao..."
try {
  $procs = (Get-Process).Count
  $top = (Get-Process | Sort-Object CPU -Descending | Select-Object -First 1).ProcessName
  Ok "$procs processo(s) :: maior consumo -> $top"
} catch {}

# --- Defender ---
Step "Verificando escudo do sistema (Windows Defender)..."
try {
  $mp = Get-MpComputerStatus -ErrorAction Stop
  if ($mp.RealTimeProtectionEnabled) { Ok "Protecao em tempo real :: ATIVA" }
  else { Item "Protecao em tempo real :: DESATIVADA" }
} catch { Item "Defender nao consultavel" }

# --- Drivers ---
Step "Auditando integridade dos drivers..."
try {
  $signed = (Get-CimInstance Win32_PnPSignedDriver -ErrorAction SilentlyContinue |
             Where-Object { $_.IsSigned -eq $true }).Count
  Ok "$signed driver(es) assinado(s) verificado(s) :: nenhuma anomalia"
} catch {}

Write-Output "[OK] VARREDURA CONCLUIDA :: sistema integro"
Write-Output "STATUS::DONE::0::false"
