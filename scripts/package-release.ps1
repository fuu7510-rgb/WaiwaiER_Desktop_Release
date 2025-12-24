param(
  [Parameter(Mandatory = $false)]
  [string]$Channel,

  [Parameter(Mandatory = $false)]
  [string]$OutDir = "release"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
  return (Convert-Path (Join-Path $PSScriptRoot ".."))
}

$repoRoot = Get-RepoRoot

if (-not $Channel -or [string]::IsNullOrWhiteSpace($Channel)) {
  if ($env:VITE_RELEASE_CHANNEL) {
    $Channel = $env:VITE_RELEASE_CHANNEL.ToLowerInvariant()
  } else {
    $Channel = 'alpha'
  }
}

if ($Channel -ne 'alpha' -and $Channel -ne 'beta' -and $Channel -ne 'stable') {
  Write-Warning "Invalid channel '$Channel'. Falling back to 'alpha'."
  $Channel = 'alpha'
}

$packageJsonPath = Join-Path $repoRoot "package.json"
if (-not (Test-Path $packageJsonPath)) {
  throw "package.json not found: $packageJsonPath"
}

$packageJson = Get-Content -Raw -Path $packageJsonPath | ConvertFrom-Json
$version = [string]$packageJson.version
if ([string]::IsNullOrWhiteSpace($version)) {
  throw "Failed to read version from package.json"
}

$outDirPath = Join-Path $repoRoot $OutDir
New-Item -ItemType Directory -Force -Path $outDirPath | Out-Null

$bundleRoot = Join-Path $repoRoot "src-tauri\target\release\bundle"
$msiDir = Join-Path $bundleRoot "msi"
$nsisDir = Join-Path $bundleRoot "nsis"

$msi = $null
if (Test-Path $msiDir) {
  $msi = Get-ChildItem -Path $msiDir -Filter "*.msi" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}

$nsis = $null
if (Test-Path $nsisDir) {
  $nsis = Get-ChildItem -Path $nsisDir -Filter "*-setup.exe" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}

if (-not $msi -and -not $nsis) {
  throw "No installers found. Run: npm run tauri:build (and make sure it completes successfully)."
}

function New-ZipFromFile {
  param(
    [Parameter(Mandatory = $true)]
    [System.IO.FileInfo]$File,

    [Parameter(Mandatory = $true)]
    [string]$ZipPath
  )

  if (Test-Path $ZipPath) {
    Remove-Item -Force $ZipPath
  }

  Compress-Archive -Path $File.FullName -DestinationPath $ZipPath -Force
}

$baseName = "WaiwaiER-Desktop-$version-$Channel-win64"

if ($msi) {
  $zipPath = Join-Path $outDirPath "$baseName-msi.zip"
  New-ZipFromFile -File $msi -ZipPath $zipPath
  Write-Host "Created: $zipPath"
}

if ($nsis) {
  $zipPath = Join-Path $outDirPath "$baseName-nsis.zip"
  New-ZipFromFile -File $nsis -ZipPath $zipPath
  Write-Host "Created: $zipPath"
}

Write-Host "Done."