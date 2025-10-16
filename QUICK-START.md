# Quick Start Guide

This guide will get you from code to production in Railway as fast as possible.

## What Changed from Your Original Code?

### Problems Fixed:
1. **No Response**: API now returns immediately with a job ID
2. **Browser Crashes**: Proper resource management and cleanup
3. **Memory Leaks**: Browsers close properly after use
4. **Timeouts**: Jobs run in background, no HTTP timeout issues
5. **No Scalability**: Redis queue allows processing thousands of URLs

### New Architecture:
- **Redis Queue**: Jobs are queued and processed asynchronously
- **Job IDs**: Track progress of long-running crawls
- **Worker Process**: Background worker processes jobs from queue
- **Proper Cleanup**: Data auto-deleted after 2 days

## Local Testing (Docker)

### 1. Update Your `.env` File

```bash
# Copy example
cp .env.example .env

# Edit .env and add your proxy
PROXY_URL=http://username:password@your-proxy.com:8080
```

### 2. Start with Docker Compose

```bash
# Start everything (Redis + API)
docker-compose up -d

# Watch logs
docker-compose logs -f crawler

# Check health
curl http://localhost:3000/health
```

### 3. Test the API

**Create a job:**
```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example.com"], "maxRequests": 5}'
```

**Check status** (use the jobId from above):
```bash
curl http://localhost:3000/jobs/YOUR_JOB_ID
```

**Get results:**
```bash
curl http://localhost:3000/jobs/YOUR_JOB_ID/results
```

### 4. Stop Services

```bash
docker-compose down
```

---

## Deploy to Railway (via Docker Hub)

### Step 1: Build and Push to Docker Hub

```bash
# Login to Docker Hub
docker login

# Build for production
docker build -t yourusername/crawlee-api:latest .

# Push to Docker Hub
docker push yourusername/crawlee-api:latest
```

**Replace** `yourusername` with your actual Docker Hub username.

### Step 2: Create Railway Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Empty Project"**

### Step 3: Add Redis

1. Click **"New"** → **"Database"** → **"Add Redis"**
2. Redis will be auto-configured with `REDIS_URL`

### Step 4: Add Your Docker Image

1. Click **"New"** → **"Docker Image"**
2. Enter: `yourusername/crawlee-api:latest`
3. Railway will pull and deploy

### Step 5: Configure Environment Variables

Click on your service → **"Variables"** tab:

```bash
# Required
PROXY_URL=http://username:password@your-proxy.com:8080

# Recommended (adjust based on your Railway plan)
MAX_CONCURRENCY=5
MAX_REQUESTS_PER_MINUTE=30
DEFAULT_MAX_REQUESTS=100
```

Railway auto-sets:
- `PORT` (don't set this!)
- `REDIS_URL` (auto-set when you add Redis)

### Step 6: Generate Domain

1. Go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. You'll get: `https://your-app.railway.app`

### Step 7: Test Your Deployment

```bash
# Health check
curl https://your-app.railway.app/health

# Create job
curl -X POST https://your-app.railway.app/crawl \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example.com"], "maxRequests": 10}'
```

---

## Using the API

### 1. Create a Crawl Job

```bash
POST /crawl
Content-Type: application/json

{
  "urls": ["https://example.com", "https://example.org"],
  "maxRequests": 100
}
```

**Response (instant):**
```json
{
  "jobId": "abc-123-def",
  "status": "queued",
  "checkStatus": "/jobs/abc-123-def"
}
```

### 2. Check Job Status

```bash
GET /jobs/abc-123-def
```

**Response:**
```json
{
  "id": "abc-123-def",
  "status": "running",
  "processedUrls": 45,
  "failedUrls": 2,
  "maxRequests": 100,
  "createdAt": 1234567890,
  "startedAt": 1234567891,
  "resultsCount": 45
}
```

**Status values:**
- `queued` - Waiting to start
- `running` - Currently crawling
- `completed` - Finished
- `failed` - Error occurred

### 3. Get Results (Paginated)

```bash
GET /jobs/abc-123-def/results?limit=10&offset=0
```

**Response:**
```json
{
  "jobId": "abc-123-def",
  "results": [
    {
      "url": "https://example.com",
      "title": "Example Domain",
      "fullText": "Example Domain\\nThis domain is for use...",
      "crawledAt": 1234567892
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 10,
    "count": 10,
    "total": 45,
    "hasMore": true
  }
}
```

### 4. Get All Results

```bash
GET /jobs/abc-123-def/results/all
```

**Warning:** Use pagination for large jobs!

### 5. Delete a Job

```bash
DELETE /jobs/abc-123-def
```

---

## Configuration Guide

### For Limited Resources (Railway Hobby Plan - 512MB)

```env
MAX_CONCURRENCY=2
MAX_REQUESTS_PER_MINUTE=10
MAX_BROWSER_INSTANCES=1
DEFAULT_MAX_REQUESTS=50
```

**Expected:** ~100-500 pages/day

### For Medium Usage (Railway Pro - 2-4GB)

```env
MAX_CONCURRENCY=5
MAX_REQUESTS_PER_MINUTE=30
MAX_BROWSER_INSTANCES=2
DEFAULT_MAX_REQUESTS=100
```

**Expected:** ~10,000-50,000 pages/day

### For High Volume (Railway Pro - 8GB+)

```env
MAX_CONCURRENCY=10
MAX_REQUESTS_PER_MINUTE=70
MAX_BROWSER_INSTANCES=5
DEFAULT_MAX_REQUESTS=10000
```

**Expected:** 100,000+ pages/day

---

## Troubleshooting

### "Unable to start browser" in Railway

**Solution:**
1. Reduce `MAX_CONCURRENCY` to 2
2. Reduce `MAX_BROWSER_INSTANCES` to 1
3. Upgrade Railway plan for more RAM

### No response from API

**Check:**
1. Is Redis connected? → Check `/health` endpoint
2. Are environment variables set? → Check Railway dashboard
3. View logs → Railway → Deployments → Latest deployment

### Jobs stuck in "queued"

**Cause:** Worker not running

**Solutions:**
1. Check logs for errors
2. Restart service in Railway
3. Verify Redis connection

### App crashes frequently

**Cause:** Not enough memory

**Solutions:**
1. Reduce concurrency settings
2. Upgrade Railway plan
3. Monitor memory usage in Railway metrics

---

## Updating Your Deployment

### 1. Make Code Changes

```bash
# Edit your code
vim src/main.js
```

### 2. Build and Push New Image

```bash
# Build new version
docker build -t yourusername/crawlee-api:latest .

# Optionally tag with version
docker tag yourusername/crawlee-api:latest yourusername/crawlee-api:v1.0.1

# Push
docker push yourusername/crawlee-api:latest
docker push yourusername/crawlee-api:v1.0.1
```

### 3. Railway Will Auto-Deploy

Railway detects the new image and redeploys automatically.

**Or manually trigger:**
- Railway dashboard → Service → Deployments → Deploy

---

## Monitoring

### Check Logs

**Railway Dashboard:**
1. Go to your project
2. Click on crawler service
3. Deployments tab → Latest → View logs

**Look for:**
- `✅ Redis connected` - System ready
- `✅ Crawler worker started` - Worker running
- `📋 Processing job: <id>` - Job started
- `✅ Job <id> completed` - Job finished
- `❌ Job <id> failed` - Check error

### Health Endpoint

```bash
curl https://your-app.railway.app/health
```

**Healthy response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "environment": "production"
}
```

---

## Cost Estimate

### Railway Plans

| Plan | RAM | CPU | Cost | Pages/Day |
|------|-----|-----|------|-----------|
| Hobby | 512MB | 0.5 | $5/mo | 100-500 |
| Pro | 8GB | 8 | $20/mo + usage | 100k+ |

**Estimated total for 100k pages/day:** $50-100/month

### Docker Hub

- **Free:** Unlimited public repos
- **Pro ($5/mo):** Private repos + faster pulls

---

## Quick Command Reference

```bash
# Local Development
docker-compose up -d          # Start
docker-compose logs -f        # Logs
docker-compose down          # Stop
docker-compose restart       # Restart

# Docker Hub
docker login
docker build -t user/image:tag .
docker push user/image:tag

# Testing
curl http://localhost:3000/health                    # Health
curl -X POST http://localhost:3000/crawl -d {...}    # Create job
curl http://localhost:3000/jobs/ID                   # Status
curl http://localhost:3000/jobs/ID/results          # Results
```

---

## Next Steps

1. **Test locally** with Docker Compose
2. **Push** to Docker Hub
3. **Deploy** to Railway
4. **Monitor** logs and metrics
5. **Scale** by adjusting environment variables

## Need Help?

- Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions
- Check [README.md](README.md) for API documentation
- Check [DOCKER-DEPLOYMENT.md](DOCKER-DEPLOYMENT.md) for Docker Hub details
- Review Railway logs for errors

---

**You're ready to go!** 🚀
