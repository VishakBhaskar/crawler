# Quick Start: Deploy to Railway in 15 Minutes

This is the condensed version for experienced users. For detailed explanations, see [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md).

---

## Step 1: Railway Setup (5 minutes)
1. Go to https://railway.app and sign up
2. Add payment method (Account Settings > Billing)
3. Click "New Project"
4. Name it: `crawler-api`

---

## Step 2: Deploy Redis (1 minute)
1. Click "+ New" > "Database" > "Add Redis"
2. Wait for green "Active" status

---

## Step 3: Deploy Crawler (3 minutes)
1. Click "+ New" > "Empty Service"
2. Rename to: `crawler-api`
3. Settings > Source Image: `paakaran/crawler:latest`
4. Click "Deploy"

---

## Step 4: Set Environment Variables (5 minutes)

Go to Variables tab and add these:

### Core Variables
```
PORT=3000
NODE_ENV=production
REDIS_URL=${{Redis.REDIS_URL}}
PROXY_URL=http://lcnsqazd-rotate:03kwkrypuwui@p.webshare.io:80
```

### Performance (100K pages/day config)
```
MAX_CONCURRENCY=12
MAX_REQUESTS_PER_MINUTE=70
DEFAULT_MAX_REQUESTS=100
MAX_LINKS_PER_PAGE=3
PAGE_TIMEOUT=30000
MAX_BROWSER_INSTANCES=6
```

### Job Management
```
JOB_TTL=172800
RESULTS_TTL=172800
MAX_JOBS_PER_REQUEST=1000
```

---

## Step 5: Configure Resources (1 minute)
1. Settings > Resources
2. Set Memory: **4096 MB (4GB)**
3. Region: **us-west1** or **us-east1**

---

## Step 6: Generate Public URL (30 seconds)
1. Settings > Networking
2. Click "Generate Domain"
3. Copy the URL (e.g., `https://crawler-api-production-xxxx.up.railway.app`)

---

## Step 7: Wait & Verify (5 minutes)
1. Go to Deployments tab
2. Wait for "Success" status (5-10 min for 4.69GB image)
3. View Logs - should see:
   ```
   ✅ Connected to Redis
   🚀 Crawler worker started
   🌐 Server running on port 3000
   ```

---

## Step 8: Test API

### Health Check
```bash
curl https://your-app.up.railway.app/health
```

### Create Crawl Job
```bash
curl -X POST https://your-app.up.railway.app/crawl \
  -H "Content-Type: application/json" \
  -d '{"urls": ["http://example.com"], "maxRequests": 10}'
```

### Check Job Status
```bash
curl https://your-app.up.railway.app/jobs/{jobId}
```

### Get Results
```bash
curl https://your-app.up.railway.app/jobs/{jobId}/results
```

---

## Critical Settings Summary

| Setting | Value | Purpose |
|---------|-------|---------|
| Memory | 4GB | Handle 12 concurrent browsers |
| MAX_CONCURRENCY | 12 | Concurrent browser instances |
| MAX_REQUESTS_PER_MINUTE | 70 | = ~100,800 pages/day |
| REDIS_URL | `${{Redis.REDIS_URL}}` | Auto-link to Redis service |
| PROXY_URL | Your Webshare URL | Rotating proxy for anti-detection |

---

## Troubleshooting

### Service won't start?
- Check all env variables are set
- Verify REDIS_URL format: `${{Redis.REDIS_URL}}`
- View logs for errors

### Out of memory?
- Increase to 6GB or 8GB
- Lower MAX_CONCURRENCY to 8

### Jobs stuck in "queued"?
- Check logs show "Crawler worker started"
- Restart the service

### Slow crawling?
- Increase MAX_CONCURRENCY (if memory allows)
- Check proxy is working
- Verify target sites are responsive

---

## Expected Costs

**4GB RAM Configuration:**
- Base: $5/month
- Resources: ~$20-25/month
- **Total: ~$25-30/month**
- **Capacity: 100,000+ pages/day**

---

## You're Done! 🚀

Your crawler is production-ready and can handle 100,000+ pages per day.

**Monitor:** Railway Dashboard > Metrics
**Logs:** Deployments > View Logs
**Support:** https://discord.gg/railway
