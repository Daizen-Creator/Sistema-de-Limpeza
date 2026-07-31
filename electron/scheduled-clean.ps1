# Limpeza automatica agendada (executada pelo Agendador de Tarefas do Windows).
$ErrorActionPreference = "SilentlyContinue"
Remove-Item "$env:TEMP\*"          -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:SystemRoot\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
ipconfig /flushdns | Out-Null
