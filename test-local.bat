@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Crawlee API Local Testing Script
echo ========================================
echo.

REM Check if .env exists
if not exist .env (
    echo [ERROR] .env file not found!
    echo Creating .env from .env.example...
    copy .env.example .env
    echo [WARNING] Please update .env with your actual PROXY_URL
    echo [WARNING] Then run this script again
    exit /b 1
)

REM Start services
echo [INFO] Starting Docker services...
docker-compose up -d

REM Wait for services to be ready
echo [INFO] Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check health
echo.
echo [INFO] Checking health endpoint...
curl -s http://localhost:3000/health > health.tmp
findstr /C:"healthy" health.tmp >nul
if %errorlevel% equ 0 (
    echo [SUCCESS] Health check passed!
    type health.tmp
) else (
    echo [ERROR] Health check failed!
    type health.tmp
    echo.
    echo Showing logs:
    docker-compose logs crawler
    del health.tmp
    exit /b 1
)
del health.tmp

REM Test root endpoint
echo.
echo [INFO] Testing root endpoint...
curl -s http://localhost:3000/

REM Create a test job
echo.
echo.
echo [INFO] Creating test crawl job...
curl -s -X POST http://localhost:3000/crawl -H "Content-Type: application/json" -d "{\"urls\": [\"https://example.com\"], \"maxRequests\": 5}" > job.tmp
type job.tmp
echo.

REM Try to extract job ID (basic parsing)
for /f "tokens=2 delims=:," %%a in ('findstr /C:"jobId" job.tmp') do (
    set JOB_ID=%%a
    set JOB_ID=!JOB_ID:"=!
    set JOB_ID=!JOB_ID: =!
)

if defined JOB_ID (
    echo.
    echo [SUCCESS] Job ID: !JOB_ID!

    REM Wait for processing
    echo.
    echo [INFO] Waiting 15 seconds for job to process...
    timeout /t 15 /nobreak >nul

    REM Check job status
    echo.
    echo [INFO] Checking job status...
    curl -s http://localhost:3000/jobs/!JOB_ID!

    REM Check results
    echo.
    echo.
    echo [INFO] Checking results...
    curl -s "http://localhost:3000/jobs/!JOB_ID!/results?limit=10"
    echo.

    REM Check proxy configuration
    findstr /C:"PROXY_URL" .env | findstr /V /C:"proxy.example.com" >nul
    if %errorlevel% equ 0 (
        echo.
        echo [SUCCESS] Proxy configured
        echo Check logs to verify proxy is being used
    ) else (
        echo.
        echo [WARNING] No proxy configured (using direct connection)
    )
) else (
    echo.
    echo [ERROR] Failed to create job
    del job.tmp
    exit /b 1
)
del job.tmp

REM Show logs
echo.
echo [INFO] Recent logs:
docker-compose logs --tail=50 crawler

echo.
echo ========================================
echo   Testing Complete!
echo ========================================
echo.
echo Useful commands:
echo   View logs:        docker-compose logs -f crawler
echo   Stop services:    docker-compose down
echo   Restart:          docker-compose restart
echo   Check health:     curl http://localhost:3000/health
echo   View Redis:       docker exec -it crawler-redis redis-cli
echo.

endlocal
