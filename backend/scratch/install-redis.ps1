$installDir = "d:\DgtLmart\GEO\backend\redis"
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force
}
Write-Output "Downloading precompiled Windows Redis (v5.0.14.1)..."
Invoke-WebRequest -Uri "https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip" -OutFile "$installDir\redis.zip"
Write-Output "Extracting archive..."
Expand-Archive -Path "$installDir\redis.zip" -DestinationPath $installDir -Force
Write-Output "Cleaning up temporary files..."
Remove-Item "$installDir\redis.zip" -Force
Write-Output "✅ Redis downloaded and extracted successfully to $installDir"
