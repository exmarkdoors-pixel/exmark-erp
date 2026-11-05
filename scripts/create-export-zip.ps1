# Create clean export zip excluding bulky dependencies and build artifacts
$ErrorActionPreference = "Stop"

$workspaceDir = Resolve-Path "."
$parentDir = Split-Path $workspaceDir -Parent
$destinationZip = Join-Path $parentDir "exmark-erp-export.zip"
$tempExportDir = Join-Path $env:TEMP "exmark-erp-export-temp"

Write-Host "Creating export package for EXMARK ERP..." -ForegroundColor Cyan

if (Test-Path $tempExportDir) {
    Remove-Item $tempExportDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempExportDir -Force | Out-Null

$excludePatterns = @(
    "node_modules",
    ".next",
    "dist",
    ".turbo",
    ".git",
    "*.log"
)

# Use robocopy to mirror files rapidly while excluding node_modules and .next
$robocopyArgs = @(
    $workspaceDir,
    (Join-Path $tempExportDir "exmark-erp"),
    "/E",
    "/XD", "node_modules", ".next", "dist", ".turbo", ".git",
    "/XF", "*.log",
    "/NDL", "/NFL", "/NJH", "/NJS"
)

& robocopy @robocopyArgs
$roboExit = $LASTEXITCODE
if ($roboExit -ge 8) {
    throw "Robocopy failed with code $roboExit"
}

if (Test-Path $destinationZip) {
    Remove-Item $destinationZip -Force
}

Write-Host "Compressing to $destinationZip ..." -ForegroundColor Cyan
Compress-Archive -Path (Join-Path $tempExportDir "exmark-erp") -DestinationPath $destinationZip -CompressionLevel Optimal

# Cleanup temp
Remove-Item $tempExportDir -Recurse -Force

$zipItem = Get-Item $destinationZip
$sizeMB = [math]::Round($zipItem.Length / 1MB, 2)
Write-Host "Export package created successfully!" -ForegroundColor Green
Write-Host "Location: $destinationZip" -ForegroundColor Yellow
Write-Host "Size: $sizeMB MB" -ForegroundColor Yellow
