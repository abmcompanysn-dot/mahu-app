# Lance toute la stack AI MAHU en local (sans Docker) : Redis portable,
# LiteLLM, le backend (Mongo en memoire) et le frontend Next.js - chacun
# dans sa propre fenetre pour pouvoir suivre les logs / les fermer separement.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Read-EnvFile($path) {
    $vars = @{}
    if (-not (Test-Path $path)) { return $vars }
    Get-Content $path | ForEach-Object {
        if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$') {
            $key = $matches[1]
            $value = $matches[2].Trim('"')
            $vars[$key] = $value
        }
    }
    return $vars
}

function Stop-Port($port) {
    Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}

Write-Host "Arret des instances precedentes (ports 3000/4000/4001)..." -ForegroundColor Yellow
Stop-Port 3000
Stop-Port 4000
Stop-Port 4001

$backendEnv = Read-EnvFile (Join-Path $root "backend\.env")
$pythonScripts = "$env:APPDATA\Python\Python313\Scripts"
$redisDir = Join-Path $root "backend\.localdev\redis"

Write-Host "Demarrage de Redis..." -ForegroundColor Cyan
Start-Process powershell -WindowStyle Normal -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$redisDir'; .\redis-server.exe --port 6379 --save ''"
)
Start-Sleep -Seconds 2

Write-Host "Demarrage de LiteLLM..." -ForegroundColor Cyan
$litellmEnvSet = @(
    "`$env:PATH = '$pythonScripts;' + `$env:PATH"
    "`$env:GROQ_API_KEY = '$($backendEnv['GROQ_API_KEY'])'"
    "`$env:OPENAI_API_KEY = '$($backendEnv['OPENAI_API_KEY'])'"
    "`$env:ANTHROPIC_API_KEY = '$($backendEnv['ANTHROPIC_API_KEY'])'"
    "`$env:LITELLM_MASTER_KEY = '$($backendEnv['LITELLM_MASTER_KEY'])'"
) -join "; "
Start-Process powershell -WindowStyle Normal -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$root'; $litellmEnvSet; litellm --config litellm/config.yaml --port 4001"
)
Start-Sleep -Seconds 2

Write-Host "Demarrage du backend (npm run dev:local)..." -ForegroundColor Cyan
Start-Process powershell -WindowStyle Normal -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$root\backend'; npm run dev:local"
)
Start-Sleep -Seconds 2

Write-Host "Demarrage du frontend (pnpm dev)..." -ForegroundColor Cyan
Start-Process powershell -WindowStyle Normal -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$root'; pnpm dev"
)

Write-Host ""
Write-Host "4 fenetres ouvertes : Redis, LiteLLM, Backend, Frontend." -ForegroundColor Green
Write-Host "Attends quelques secondes puis ouvre http://localhost:3000" -ForegroundColor Green
Write-Host "Pour tout arreter : ferme les 4 fenetres (ou Ctrl+C dans chacune)." -ForegroundColor Gray
Start-Sleep -Seconds 6
Start-Process "http://localhost:3000/ai"
