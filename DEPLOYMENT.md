# Railway Deployment Guide

This guide will help you deploy the Crawlee API to Railway with Redis support.

## Prerequisites

1. Railway account (sign up at https://railway.app)
2. GitHub account (to connect your repository)
3. Your code pushed to a GitHub repository

## Step-by-Step Deployment

### 1. Create a New Railway Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub account
5. Select the repository containing this code

### 2. Add Redis to Your Project

1. In your Railway project dashboard, click **"New"**
2. Select **"Database"**
3. Choose **"Add Redis"**
4. Railway will automatically:
   - Create a Redis instance
   - Set the `REDIS_URL` environment variable for your app
   - Link the Redis instance to your application

### 3. Configure Environment Variables

1. Click on your web service in the Railway dashboard
2. Go to the **"Variables"** tab
3. Add the following environment variables:

```bash
# Required
PROXY_URL=http://username:password@your-proxy.com:8080

# Optional (defaults are provided)
MAX_CONCURRENCY=5
MAX_REQUESTS_PER_MINUTE=30
DEFAULT_MAX_REQUESTS=100
MAX_LINKS_PER_PAGE=3
PAGE_TIMEOUT=30000
NODE_ENV=production
```

**Important**: Railway automatically provides:
- `PORT` (don't set this)
- `REDIS_URL` (automatically set when you add Redis)

### 4. Configure Resource Limits

Railway's hobby plan may struggle with multiple browser instances. Recommended settings:

1. Go to **"Settings"** tab in your service
2. Scroll to **"Resources"**
3. Consider upgrading to a paid plan for better resources:
   - **Hobby Plan**: 512MB RAM, 0.5 vCPU (will crash frequently)
   - **Pro Plan**: 8GB RAM, 8 vCPU (recommended)

**Recommended environment variables for limited resources:**
```bash
MAX_CONCURRENCY=3
MAX_BROWSER_INSTANCES=2
MAX_REQUESTS_PER_MINUTE=20
```

### 5. Deploy

1. Railway will automatically deploy when you push to your GitHub repository
2. Watch the deployment logs in the **"Deployments"** tab
3. Initial deployment takes 5-10 minutes (installing browsers)

### 6. Get Your API URL

1. Go to the **"Settings"** tab
2. Scroll to **"Networking"**
3. Click **"Generate Domain"**
4. Your API will be available at: `https://your-app.railway.app`

## Testing Your Deployment

### 1. Health Check

```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "environment": "production"
}
```

### 2. Create a Crawl Job

```bash
curl -X POST https://your-app.railway.app/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://example.com"],
    "maxRequests": 10
  }'
```

Expected response:
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Job created successfully",
  "status": "queued",
  "checkStatus": "/jobs/123e4567-e89b-12d3-a456-426614174000",
  "getResults": "/jobs/123e4567-e89b-12d3-a456-426614174000/results"
}
```

### 3. Check Job Status

```bash
curl https://your-app.railway.app/jobs/YOUR_JOB_ID
```

### 4. Get Results

```bash
# Paginated results (recommended)
curl https://your-app.railway.app/jobs/YOUR_JOB_ID/results?limit=100&offset=0

# All results (use with caution for large jobs)
curl https://your-app.railway.app/jobs/YOUR_JOB_ID/results/all
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/` | API information |
| POST | `/crawl` | Create new crawl job |
| GET | `/jobs/:jobId` | Get job status |
| GET | `/jobs/:jobId/results` | Get paginated results |
| GET | `/jobs/:jobId/results/all` | Get all results |
| DELETE | `/jobs/:jobId` | Delete job and results |

## Understanding the New Architecture

### Key Changes from Your Original Code

1. **Asynchronous Processing**:
   - Old: API waits for entire crawl to complete (timeout issues)
   - New: Returns job ID immediately, crawl runs in background

2. **Redis Queue System**:
   - Jobs are queued in Redis
   - Worker processes jobs from queue
   - Results stored in Redis for 2 days

3. **No Timeout Issues**:
   - API responds in milliseconds
   - Crawl runs independently
   - Check status anytime via job ID

4. **Better Resource Management**:
   - Browser instances are properly closed
   - Memory is released after each job
   - Browsers are retired after 20 pages

### How It Works

```
Client Request → API (creates job) → Redis Queue → Worker (processes) → Results in Redis
     ↓                                                                        ↑
 Returns Job ID immediately                           Client polls for results
```

## Scaling for 100,000 Pages/Day

To crawl 100,000 pages per day:

### Calculations
- 100,000 pages/day ÷ 24 hours = 4,166 pages/hour
- 4,166 pages/hour ÷ 60 minutes = 69 pages/minute

### Recommended Configuration

```bash
# Environment variables
MAX_CONCURRENCY=10
MAX_REQUESTS_PER_MINUTE=70
MAX_BROWSER_INSTANCES=5
DEFAULT_MAX_REQUESTS=10000

# Railway Plan
Pro Plan or higher (8GB RAM minimum)
```

### Multiple Workers (Advanced)

For even better performance, deploy multiple worker instances:

1. Create a new service in Railway
2. Use the same code
3. Set environment variable: `WORKER_ONLY=true`
4. Both services connect to same Redis

## Monitoring

### Check Logs

1. Go to Railway dashboard
2. Click on your service
3. Go to **"Deployments"** tab
4. Click on latest deployment
5. View real-time logs

### Important Log Messages

- `✅ Redis connected` - Redis is working
- `✅ Crawler worker started` - Worker is processing jobs
- `📋 Processing job: <id>` - Job started
- `✅ Job <id> completed` - Job finished
- `❌ Job <id> failed` - Job encountered error

## Troubleshooting

### Issue: "Unable to start browser"

**Solution 1**: Reduce concurrency
```bash
MAX_CONCURRENCY=2
MAX_BROWSER_INSTANCES=1
```

**Solution 2**: Upgrade Railway plan for more RAM

### Issue: App keeps crashing

**Cause**: Not enough memory

**Solutions**:
1. Upgrade Railway plan
2. Reduce `MAX_CONCURRENCY`
3. Reduce `MAX_BROWSER_INSTANCES`
4. Lower `DEFAULT_MAX_REQUESTS`

### Issue: No response from API

**Check**:
1. Is Redis connected? Check `/health` endpoint
2. Are environment variables set?
3. Check deployment logs for errors

### Issue: Jobs stuck in "queued" status

**Cause**: Worker not running

**Solutions**:
1. Check logs for worker errors
2. Restart the service
3. Check Redis connection

## Data Cleanup

Jobs and results are automatically deleted after 2 days. This is configured via:

```bash
JOB_TTL=172800        # 2 days in seconds
RESULTS_TTL=172800    # 2 days in seconds
```

Cleanup runs automatically every 12 hours.

## Cost Estimation (Railway)

### Hobby Plan ($5/month)
- 512MB RAM, 0.5 vCPU
- **Not recommended** - will crash frequently
- Can handle ~100 pages/day

### Pro Plan ($20/month + usage)
- 8GB RAM, 8 vCPU
- Can handle 100,000+ pages/day
- Estimated: $50-100/month with heavy usage

### Redis Add-on
- Included in usage costs
- Minimal cost for queue data

## Support

If you encounter issues:

1. Check the logs in Railway dashboard
2. Verify all environment variables are set
3. Check Redis is connected via `/health` endpoint
4. Review the troubleshooting section above

## Next Steps

1. Set up monitoring (optional)
2. Implement rate limiting (if needed)
3. Add authentication to protect your API
4. Set up webhooks for job completion notifications
5. Consider using Railway's built-in metrics for performance monitoring
