[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$mobilePath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$projectsPath = Split-Path (Split-Path $mobilePath -Parent) -Parent
$launcher = Join-Path $projectsPath 'MultiVendorEcommercePlatform\scripts\Stop-Dev.ps1'
if (-not (Test-Path -LiteralPath $launcher)) { throw 'Khong tim thay Stop-Dev.ps1 cua du an API/web ben canh.' }
& $launcher
