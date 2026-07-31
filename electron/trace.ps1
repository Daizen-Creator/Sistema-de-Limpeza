# =====================================================================
#  TRACEROUTE :: diagnostico de rota de rede (modulo 9.4)
#  Streaming ao vivo para a tela Matrix.
# =====================================================================
param([string]$Target = "google.com")

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# valida o alvo (evita argumentos estranhos)
if ($Target -notmatch '^[A-Za-z0-9.\-]{1,120}$') {
  Write-Output "[ERR] Alvo invalido."
  Write-Output "STATUS::ERROR::0::false"
  return
}

Write-Output "==============================================================="
Write-Output "   TRACEROUTE :: $Target :: DANIEL SANTOS CIRIACO"
Write-Output "==============================================================="
Write-Output "[*] Mapeando a rota ate $Target (max 20 saltos)..."
Write-Output "[>] Aguarde, cada salto pode levar alguns segundos..."

$hops = 0
# -d = nao resolve nomes (mais rapido); -h 20 = max saltos
tracert -d -h 20 $Target 2>&1 | ForEach-Object {
  $line = $_.Trim()
  if ($line -match '^\d+') {
    $hops++
    Write-Output "[>] $line"
  } elseif ($line -and $line -notmatch 'Rastreando|Tracing|sobre um|over a|maximo|maximum') {
    Write-Output $line
  }
}

Write-Output "[OK] ROTA MAPEADA :: $hops salto(s) ate o destino"
Write-Output "STATUS::DONE::$hops::false"
