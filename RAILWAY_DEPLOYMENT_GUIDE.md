# Railway Deployment Guide - Crawlee Crawler Service

Complete step-by-step guide to deploy your crawler to Railway using Docker Hub image.

---

## Prerequisites

Before you start, make sure you have:
- ✅ Railway account (sign up at https://railway.app)
- ✅ Docker Hub image: `paakaran/crawler:latest` (already pushed)
- ✅ Credit card for Railway (for usage beyond free tier)
- ✅ Webshare proxy credentials (already have: lcnsqazd-rotate:03kwkrypuwui@p.webshare.io:80)

---

## Part 1: Create Railway Account & Project

### Step 1: Sign Up for Railway
1. Go to https://railway.app
2. Click **"Start a New Project"** or **"Login"**
3. Sign in with **GitHub** (recommended) or email
4. Verify your email if prompted

### Step 2: Add Payment Method (Required for Production)
1. Click your profile picture (top right)
2. Go to **"Account Settings"**
3. Click **"Plans"** or **"Billing"**
4. Add a credit card
   - Railway charges $5/month base + usage
   - With 4GB RAM: Expect ~$25-30/month total

### Step 3: Create a New Project
1. From Railway dashboard, click **"New Project"**
2. You'll see a blank project canvas
3. Name your project: `crawler-api` (click project name at top to rename)

---

## Part 2: Deploy Redis Database

### Step 4: Add Redis Service
1. In your project, click **"+ New"** button
2. Select **"Database"**
3. Choose **"Add Redis"**
4. Railway will automatically:
   - Create a Redis instance
   - Generate a `REDIS_URL` environment variable
   - Start the service

### Step 5: Verify Redis is Running
1. Click on the **Redis** service card
2. You should see:
   - Status: **"Active"** (green)
   - A **"REDIS_URL"** in the Variables tab
3. Keep this tab open - you'll need the Redis URL later

---

## Part 3: Deploy Your Crawler Service

### Step 6: Add Docker Hub Service
1. Back in your project canvas, click **"+ New"** button again
2. This time select **"Empty Service"**
3. A new service card will appear

### Step 7: Configure Docker Image
1. Click on the new service card
2. Go to **"Settings"** tab (left sidebar)
3. Under **"Service Name"**, rename it to: `crawler-api`
4. Scroll to **"Source"** section
5. Under **"Source Image"**, enter: `paakaran/crawler:latest`
6. Click **"Deploy"** (it will start deploying immediately)

### Step 8: Configure Environment Variables
This is **CRITICAL** - your crawler won't work without these.

1. Click on your `crawler-api` service
2. Go to **"Variables"** tab (left sidebar)
3. Click **"+ New Variable"** for each of these:

**Required Variables:**

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `PORT` | `3000` | Port your API listens on |
| `NODE_ENV` | `production` | Running in production mode |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | **IMPORTANT: Use Railway reference (see below)** |
| `PROXY_URL` | `http://lcnsqazd-rotate:03kwkrypuwui@p.webshare.io:80` | Your Webshare proxy |

**Performance Variables (for 100K pages/day):**

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `MAX_CONCURRENCY` | `12` | Number of concurrent browser instances |
| `MAX_REQUESTS_PER_MINUTE` | `70` | Rate limit (70 req/min = ~100K/day) |
| `DEFAULT_MAX_REQUESTS` | `100` | Default max pages per job |
| `MAX_LINKS_PER_PAGE` | `3` | Max links to follow per page |
| `PAGE_TIMEOUT` | `30000` | Page load timeout (30 seconds) |
| `MAX_BROWSER_INSTANCES` | `6` | Max browser pool size |

**Job Management Variables:**

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `JOB_TTL` | `172800` | Job expires after 2 days (in seconds) |
| `RESULTS_TTL` | `172800` | Results expire after 2 days |
| `MAX_JOBS_PER_REQUEST` | `1000` | Max jobs to fetch at once |

**How to Link Redis URL (IMPORTANT):**
- For `REDIS_URL`, don't paste the actual URL
- Instead, type: `${{Redis.REDIS_URL}}`
- This is a Railway "reference" that automatically connects to your Redis service
- Railway will replace it with the actual Redis URL at runtime

### Step 9: Configure Resource Allocation
1. Stay in **"Settings"** tab
2. Scroll to **"Resources"** section
3. Set the following:

**Memory:**
- Click the memory slider
- Set to: **4096 MB (4GB)**

**CPU:**
- Railway doesn't let you set exact vCPUs
- But with 4GB RAM, you'll get ~4 vCPUs automatically

**Region:**
- Choose the region closest to your target websites
- **"us-west1"** or **"us-east1"** recommended

### Step 10: Enable Public Access
Your API needs to be accessible from the internet.

1. Still in **"Settings"** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"**
4. Railway will create a public URL like: `crawler-api-production-xxxx.up.railway.app`
5. **Save this URL** - this is your API endpoint!

---

## Part 4: Deploy & Verify

### Step 11: Wait for Deployment
1. Go to **"Deployments"** tab (left sidebar)
2. You'll see the deployment in progress
3. Wait for status to change to **"Success"** (green checkmark)
4. This takes 5-10 minutes (Docker image is 4.69GB)

**Deployment Stages:**
- **Building**: Pulling image from Docker Hub
- **Deploying**: Starting containers
- **Success**: Service is live!

### Step 12: Check Logs
1. Click **"View Logs"** in the Deployments tab
2. You should see:
   ```
   🚀 Starting Crawlee API Server...
   ✅ Connected to Redis
   ✅ Redis Client Ready
   🚀 Crawler worker started
   🌐 Server running on port 3000
   ```
3. If you see errors, check your environment variables

### Step 13: Test Your API
1. Get your Railway URL from Step 10
2. Open a terminal or Postman
3. Test the health endpoint:

```bash
curl https://your-app.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "redis": "connected",
  "timestamp": 1234567890
}
```

### Step 14: Create Your First Crawl Job
```bash
curl -X POST https://your-app.up.railway.app/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["http://www.sbworldtravel.com"],
    "maxRequests": 10
  }'
```

Expected response:
```json
{
  "jobId": "abc-123-xyz",
  "message": "Job created successfully",
  "status": "queued",
  "checkStatus": "/jobs/abc-123-xyz",
  "getResults": "/jobs/abc-123-xyz/results"
}
```

### Step 15: Check Job Status
```bash
curl https://your-app.up.railway.app/jobs/abc-123-xyz
```

### Step 16: Get Results
```bash
curl https://your-app.up.railway.app/jobs/abc-123-xyz/results
```

---

## Part 5: Monitoring & Scaling

### Monitor Resource Usage
1. In Railway, click your `crawler-api` service
2. Go to **"Metrics"** tab
3. Watch:
   - **CPU Usage**: Should be 40-80% under load
   - **Memory Usage**: Should stay under 3.5GB
   - **Network**: Monitor bandwidth usage

### View Logs in Real-Time
1. Go to **"Deployments"** tab
2. Click **"View Logs"**
3. Keep this open to monitor crawling activity

### Set Up Alerts (Optional but Recommended)
1. Go to **"Settings"** > **"Notifications"**
2. Connect Slack or Discord
3. Get alerts for:
   - Deployment failures
   - High memory usage
   - Service crashes

### Scale Up If Needed
If you need more than 100K pages/day:

1. **Vertical Scaling** (same service, more resources):
   - Settings > Resources
   - Increase memory to 8GB
   - Update `MAX_CONCURRENCY` to 24
   - Update `MAX_REQUESTS_PER_MINUTE` to 140

2. **Horizontal Scaling** (multiple crawler workers):
   - Click "+ New"
   - Deploy another `paakaran/crawler:latest`
   - Use the same Redis instance
   - Both workers will share the job queue

---

## Part 6: Cost Management

### Expected Costs (4GB RAM / 4vCPU)
- **Base Plan**: $5/month
- **Resource Usage**: ~$20-25/month
- **Total**: ~$25-30/month
- **Per Page Cost**: ~$0.00029 per page (at 100K pages/day)

### Monitor Spending
1. Dashboard > "Usage"
2. Set spending limits if needed
3. Get billing alerts

### Cost Optimization Tips
1. **Start with 2GB RAM** and scale up if needed
2. **Set lower MAX_CONCURRENCY** initially (e.g., 8)
3. **Monitor actual usage** before scaling
4. **Use Railway's free tier credits** first

---

## Part 7: Troubleshooting

### Issue: Service Won't Start
**Check:**
1. View Logs for error messages
2. Verify all environment variables are set
3. Ensure `REDIS_URL` uses Railway reference: `${{Redis.REDIS_URL}}`
4. Check Docker Hub image is accessible

### Issue: Out of Memory Errors
**Solution:**
1. Increase memory allocation to 6GB or 8GB
2. Lower `MAX_CONCURRENCY` to reduce browser instances
3. Check for memory leaks in logs

### Issue: Slow Crawling
**Check:**
1. Proxy is working (check Webshare dashboard)
2. Target websites are responsive
3. Increase `MAX_CONCURRENCY` if resources allow
4. Check CPU usage isn't maxed out

### Issue: Redis Connection Failed
**Solution:**
1. Verify Redis service is running (green status)
2. Check `REDIS_URL` is correctly referenced
3. Restart both services:
   - Redis: Settings > Restart
   - Crawler: Settings > Restart

### Issue: API Returns 502 Bad Gateway
**Solution:**
1. Service might be starting up (wait 2-3 minutes)
2. Check deployment succeeded
3. Verify `PORT` environment variable is set to `3000`
4. Check logs for startup errors

### Issue: Jobs Stuck in "queued" Status
**Solution:**
1. Check crawler worker is running (view logs)
2. Verify Redis connection is active
3. Restart the crawler service

---

## Part 8: API Documentation

Once deployed, your API has these endpoints:

### 1. Health Check
```bash
GET https://your-app.up.railway.app/health
```

### 2. Create Crawl Job
```bash
POST https://your-app.up.railway.app/crawl
Content-Type: application/json

{
  "urls": ["https://example.com"],
  "maxRequests": 100  // optional, defaults to 100
}
```

### 3. Get Job Status
```bash
GET https://your-app.up.railway.app/jobs/:jobId
```

### 4. Get Job Results (Paginated)
```bash
GET https://your-app.up.railway.app/jobs/:jobId/results?offset=0&limit=100
```

### 5. Get All Results
```bash
GET https://your-app.up.railway.app/jobs/:jobId/results/all
```

### 6. List All Jobs
```bash
GET https://your-app.up.railway.app/jobs
```

---

## Part 9: Production Best Practices

### Security
1. **Add API Key Authentication** (future enhancement)
2. **Rate Limiting**: Already built-in (`MAX_REQUESTS_PER_MINUTE`)
3. **Environment Variables**: Never commit to Git
4. **Proxy Rotation**: Using Webshare rotating proxy ✅

### Monitoring
1. **Set up alerts** for service downtime
2. **Monitor proxy usage** on Webshare dashboard
3. **Track API response times**
4. **Watch Redis memory usage**

### Backup & Recovery
1. **Redis Snapshots**: Railway auto-backs up Redis
2. **Job Data**: Expires after 2 days (configurable via `JOB_TTL`)
3. **Docker Image**: Backed up on Docker Hub

### Performance Optimization
1. **Start conservative**: MAX_CONCURRENCY=8
2. **Monitor and adjust**: Increase if CPU/memory allows
3. **Track success rate**: Should be >98%
4. **Optimize based on target sites**: Some sites need longer timeouts

---

## Quick Reference Card

**Your Railway URLs:**
- Dashboard: https://railway.app/project/your-project-id
- API Endpoint: https://your-app.up.railway.app
- Health Check: https://your-app.up.railway.app/health

**Key Settings:**
- Memory: 4GB
- Concurrency: 12 browsers
- Rate: 70 requests/min
- Capacity: ~100,000 pages/day

**Important Variables:**
- `REDIS_URL`: `${{Redis.REDIS_URL}}`
- `PROXY_URL`: (your Webshare proxy)
- `MAX_CONCURRENCY`: 12
- `MAX_REQUESTS_PER_MINUTE`: 70

**Support:**
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Your Logs: Railway Dashboard > Deployments > View Logs

---

## Summary Checklist

Before going live, verify:
- ✅ Redis service is running (green)
- ✅ Crawler service deployed successfully
- ✅ All environment variables set correctly
- ✅ Public domain generated
- ✅ Health check returns 200 OK
- ✅ Test crawl job completes successfully
- ✅ Results are retrievable
- ✅ Logs show no errors
- ✅ Memory usage is reasonable (<3.5GB)
- ✅ Billing/spending limits configured

---

**You're all set!** Your crawler is now production-ready and can handle 100,000+ pages per day. 🚀
