# Runs one of the app's Node.js scripts on Windows, installing Node.js first
# if it is missing or too old. start.cmd and update-database.cmd call it.
# ASCII only, for Windows PowerShell 5.1: it reads a file without a BOM in
# the system's code page, where other characters can break the script.
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('start', 'update-database')]
  [string]$Script
)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$required = [int]((Get-Content (Join-Path $root '.nvmrc') -Raw).Trim())

function Get-NodeMajor {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { return 0 }
  $version = (& node --version).Trim().TrimStart('v')
  return [int]($version.Split('.')[0])
}

if ((Get-NodeMajor) -lt $required) {
  Write-Host "This app needs Node.js $required or newer, and it is not installed yet."
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host 'Install the LTS version from https://nodejs.org, then run this again.'
    exit 1
  }
  $answer = Read-Host 'Install Node.js LTS now, with winget? [Y/n]'
  if ($answer -and $answer -notmatch '^[Yy]') {
    Write-Host 'Install the LTS version from https://nodejs.org, then run this again.'
    exit 1
  }
  # Windows may ask for permission to install: answer yes.
  winget install --id OpenJS.NodeJS.LTS --exact --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'winget could not install Node.js. Install it from https://nodejs.org, then run this again.'
    exit 1
  }
  # The installer changes PATH for new windows only: reload it for this one.
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
    [Environment]::GetEnvironmentVariable('Path', 'User')
  if ((Get-NodeMajor) -lt $required) {
    Write-Host 'Node.js is installed. Close this window and run the file again.'
    exit 1
  }
}

& node (Join-Path $root "scripts\$Script.mjs")
exit $LASTEXITCODE
