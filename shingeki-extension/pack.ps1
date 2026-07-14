# Pack unpacked MV3 files into the Next.js public download.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Split-Path -Parent $root
$outDir = Join-Path $repo "shingeki-client\public\extensions"
$outZip = Join-Path $outDir "shingeki-target-session.zip"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if (Test-Path $outZip) {
  Remove-Item $outZip -Force
}

Push-Location $root
try {
  Compress-Archive -Path @(
    "manifest.json",
    "background.js",
    "content-bridge.js",
    "popup.html",
    "popup.js",
    "README.md",
    "icons"
  ) -DestinationPath $outZip -Force
} finally {
  Pop-Location
}

Write-Output "Wrote $outZip"
Get-Item $outZip | Select-Object Length, FullName
