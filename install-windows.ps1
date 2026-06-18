# Chimera Windows Installer — one-click install & run
$ErrorActionPreference = "Stop"

$repo = "TerexitariusStomp/qvac-chimera"
$api = "https://api.github.com/repos/$repo/releases/latest"

Write-Host "=== Chimera Installer for Windows ===" -ForegroundColor Cyan
Write-Host "Fetching latest release..."

# Get release info
$response = Invoke-RestMethod -Uri $api -UseBasicParsing
$asset = $response.assets | Where-Object { $_.name -like "*.msi" -or $_.name -like "*.exe" } | Select-Object -First 1

if (-not $asset) {
    Write-Host "Could not find Windows release. Please download manually from:" -ForegroundColor Red
    Write-Host "  https://github.com/$repo/releases"
    exit 1
}

$url = $asset.browser_download_url
$outFile = "$env:TEMP\Chimera-Setup.exe"

Write-Host "Downloading $($asset.name)..."
Invoke-WebRequest -Uri $url -OutFile $outFile -UseBasicParsing

Write-Host "Installing..."
Start-Process -FilePath $outFile -ArgumentList "/S" -Wait

# Check Docker
Write-Host "Checking Docker..."
$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Host "WARNING: Docker not found. Chimera requires Docker to run the backend." -ForegroundColor Yellow
    Write-Host "Install Docker Desktop: https://docs.docker.com/desktop/install/windows-install/"
}

Write-Host ""
Write-Host "=== Installation complete ===" -ForegroundColor Green
Write-Host "Starting Chimera..."

# Try to find and start Chimera
$chimeraPath = "$env:LOCALAPPDATA\Chimera\chimera-desktop.exe"
if (Test-Path $chimeraPath) {
    Start-Process $chimeraPath
} else {
    $chimeraPath = "$env:ProgramFiles\Chimera\chimera-desktop.exe"
    if (Test-Path $chimeraPath) {
        Start-Process $chimeraPath
    } else {
        Write-Host "Chimera installed. Please find it in your Start Menu."
    }
}
