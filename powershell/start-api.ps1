$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Error 'PostgreSQL is not installed or psql is not on PATH. Install PostgreSQL, then run this script again.'
}

if (-not (Test-Path '.env')) {
    $secret = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 } | ForEach-Object { [byte]$_ }))
    @(
        'PORT=3000'
        'DATABASE_URL=postgres://postgres:postgres@localhost:5432/nexatill'
        "JWT_SECRET=$secret"
        'CLIENT_ORIGIN=http://127.0.0.1:5500'
    ) | Set-Content '.env'
    Write-Host 'Created .env with a random local JWT secret.'
}

$env:DATABASE_URL = ((Get-Content '.env' | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', '')
Write-Host 'Applying database schema...'
psql $env:DATABASE_URL -f sql\schema.sql
Write-Host 'Starting KoraPoint API on http://localhost:3000 ...'
npm start
