# Redis Setup Script for SkipTrace (Windows)
# This script helps you set up Redis for local development

Write-Host "SkipTrace Redis Setup" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is available
$dockerAvailable = $false
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerAvailable = $true
        Write-Host "✅ Docker is installed: $dockerVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Docker is not installed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setup Options:" -ForegroundColor Cyan
Write-Host "1. Docker (Recommended - if Docker is installed)"
Write-Host "2. WSL2 (Windows Subsystem for Linux)"
Write-Host "3. Memurai (Windows native Redis alternative)"
Write-Host "4. Cloud Redis (Upstash - free tier available)"
Write-Host ""

if ($dockerAvailable) {
    Write-Host "Quick Start with Docker:" -ForegroundColor Green
    Write-Host "  docker run -d --name skiptrace-redis -p 6379:6379 redis:7-alpine" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To verify Redis is running:" -ForegroundColor Green
    Write-Host "  docker exec -it skiptrace-redis redis-cli ping" -ForegroundColor Yellow
    Write-Host "  (Should return: PONG)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "For detailed instructions, see: REDIS_SETUP.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "After Redis is running, test the connection:" -ForegroundColor Green
Write-Host "  Visit: http://localhost:3000/api/health" -ForegroundColor Yellow
Write-Host ""
