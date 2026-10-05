[CmdletBinding()]
param([switch]$LocalOnly, [switch]$OpenBrowser, [switch]$UseRunningApi, [switch]$Tunnel)
$ErrorActionPreference = 'Stop'
$mobilePath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$projectsPath = Split-Path (Split-Path $mobilePath -Parent) -Parent
$launcher = Join-Path $projectsPath 'MultiVendorEcommercePlatform\scripts\Start-Dev.ps1'
if (-not (Test-Path -LiteralPath $launcher)) { throw 'Khong tim thay Start-Dev.ps1 cua du an API/web ben canh.' }
& $launcher -MobileProjectPath $mobilePath -LocalOnly:$LocalOnly -OpenBrowser:$OpenBrowser -UseRunningApi:$UseRunningApi -Tunnel:$Tunnel
