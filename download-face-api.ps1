# PowerShell script to download face-api.js for student extension

Write-Host "Downloading face-api.js for Student Extension..." -ForegroundColor Cyan

# Create libs directory if it doesn't exist
$libsPath = "student-extension/libs"
if (!(Test-Path $libsPath)) {
    New-Item -ItemType Directory -Path $libsPath -Force | Out-Null
    Write-Host "Created $libsPath directory" -ForegroundColor Green
}

# Download face-api.js
$url = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js"
$outputPath = "$libsPath/face-api.min.js"

try {
    Write-Host "Downloading from: $url" -ForegroundColor Yellow
    Invoke-WebRequest -Uri $url -OutFile $outputPath
    
    # Check file size
    $fileSize = (Get-Item $outputPath).Length
    $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
    
    Write-Host "Download complete! File size: $fileSizeMB MB" -ForegroundColor Green
    Write-Host "Saved to: $outputPath" -ForegroundColor Green
    
    if ($fileSize -lt 100KB) {
        Write-Host "WARNING: File size seems too small. Download may have failed." -ForegroundColor Red
    }
} catch {
    Write-Host "Error downloading face-api.js: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nSetup complete! You can now load the student extension in Chrome." -ForegroundColor Cyan
