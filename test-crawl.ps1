# PowerShell test script for Windows

Write-Host "`n========================================" -ForegroundColor Blue
Write-Host "  Crawlee API Local Testing" -ForegroundColor Blue
Write-Host "========================================`n" -ForegroundColor Blue

# Test health
Write-Host "🏥 Testing health endpoint..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
    Write-Host "✅ Health check passed!" -ForegroundColor Green
    Write-Host ($health | ConvertTo-Json) -ForegroundColor Gray
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
    exit 1
}

# Create crawl job
Write-Host "`n📝 Creating crawl job for http://www.sbworldtravel.com..." -ForegroundColor Cyan

$body = @{
    urls = @("http://www.sbworldtravel.com")
    maxRequests = 5
} | ConvertTo-Json

try {
    $job = Invoke-RestMethod -Uri "http://localhost:3000/crawl" `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -TimeoutSec 10

    Write-Host "✅ Job created successfully!" -ForegroundColor Green
    Write-Host "Job ID: $($job.jobId)" -ForegroundColor Yellow
    Write-Host ($job | ConvertTo-Json) -ForegroundColor Gray

    $jobId = $job.jobId

    # Monitor job status
    Write-Host "`n⏳ Monitoring job status..." -ForegroundColor Cyan

    for ($i = 1; $i -le 20; $i++) {
        Start-Sleep -Seconds 5

        try {
            $status = Invoke-RestMethod -Uri "http://localhost:3000/jobs/$jobId" -Method Get
            Write-Host "[$i] Status: $($status.status) | Processed: $($status.processedUrls)/$($status.maxRequests) | Failed: $($status.failedUrls)" -ForegroundColor Yellow

            if ($status.status -eq "completed") {
                Write-Host "`n✅ Job completed!" -ForegroundColor Green
                break
            }

            if ($status.status -eq "failed") {
                Write-Host "`n❌ Job failed!" -ForegroundColor Red
                Write-Host ($status | ConvertTo-Json) -ForegroundColor Gray
                exit 1
            }
        } catch {
            Write-Host "⚠️  Status check error: $_" -ForegroundColor Yellow
        }
    }

    # Get results
    Write-Host "`n📦 Fetching results..." -ForegroundColor Cyan

    try {
        $results = Invoke-RestMethod -Uri "http://localhost:3000/jobs/$jobId/results?limit=5" -Method Get

        Write-Host "`n✅ Retrieved $($results.results.Count) results out of $($results.pagination.total) total" -ForegroundColor Green

        Write-Host "`n📄 Sample Results:`n" -ForegroundColor Cyan
        foreach ($result in $results.results) {
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
            Write-Host "URL: $($result.url)" -ForegroundColor White
            Write-Host "Title: $($result.title)" -ForegroundColor White
            Write-Host "Text Preview: $($result.fullText.Substring(0, [Math]::Min(200, $result.fullText.Length)))..." -ForegroundColor Gray
            Write-Host ""
        }

        # Show full job stats
        Write-Host "`n📊 Final Statistics:" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
        Write-Host "Job Status: $($results.job.status)" -ForegroundColor White
        Write-Host "Processed URLs: $($results.job.processedUrls)" -ForegroundColor White
        Write-Host "Failed URLs: $($results.job.failedUrls)" -ForegroundColor White
        Write-Host "Total Results: $($results.pagination.total)" -ForegroundColor White

        Write-Host "`n✅ All tests completed successfully!" -ForegroundColor Green

    } catch {
        Write-Host "❌ Failed to fetch results: $_" -ForegroundColor Red
        exit 1
    }

} catch {
    Write-Host "❌ Failed to create job: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Blue
Write-Host "" -ForegroundColor Blue
