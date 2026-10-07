Write-Host "Starting Smart Waste Management System..." -ForegroundColor Green
Write-Host ""
Write-Host "Backend: http://localhost:5000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop both services" -ForegroundColor Red
Write-Host ""

Set-Location $PSScriptRoot
npm.cmd run dev