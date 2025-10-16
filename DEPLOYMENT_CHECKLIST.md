# Railway Deployment Checklist

Print this or keep it open while deploying. Check off each item as you complete it.

---

## Pre-Deployment

- [ ] Railway account created
- [ ] Payment method added to Railway
- [ ] Docker Hub image verified: `paakaran/crawler:latest`
- [ ] Webshare proxy credentials ready
- [ ] Read RAILWAY_DEPLOYMENT_GUIDE.md

---

## Railway Project Setup

- [ ] New Railway project created
- [ ] Project renamed to: `crawler-api`

---

## Redis Deployment

- [ ] Redis service added (Database > Redis)
- [ ] Redis status shows **"Active"** (green)
- [ ] REDIS_URL visible in Variables tab

---

## Crawler Service Deployment

- [ ] Empty Service created
- [ ] Service renamed to: `crawler-api`
- [ ] Source Image set to: `paakaran/crawler:latest`
- [ ] Initial deployment triggered

---

## Environment Variables Configuration

### Core Variables (Required)
- [ ] `PORT` = `3000`
- [ ] `NODE_ENV` = `production`
- [ ] `REDIS_URL` = `${{Redis.REDIS_URL}}` ⚠️ IMPORTANT: Use this exact format
- [ ] `PROXY_URL` = `http://lcnsqazd-rotate:03kwkrypuwui@p.webshare.io:80`

### Performance Variables
- [ ] `MAX_CONCURRENCY` = `12`
- [ ] `MAX_REQUESTS_PER_MINUTE` = `70`
- [ ] `DEFAULT_MAX_REQUESTS` = `100`
- [ ] `MAX_LINKS_PER_PAGE` = `3`
- [ ] `PAGE_TIMEOUT` = `30000`
- [ ] `MAX_BROWSER_INSTANCES` = `6`

### Job Management Variables
- [ ] `JOB_TTL` = `172800`
- [ ] `RESULTS_TTL` = `172800`
- [ ] `MAX_JOBS_PER_REQUEST` = `1000`

---

## Resource Configuration

- [ ] Memory set to: **4096 MB (4GB)**
- [ ] Region selected: **us-west1** or **us-east1**

---

## Networking Setup

- [ ] Public domain generated
- [ ] Domain URL copied and saved: `https://__________________________.up.railway.app`

---

## Deployment Verification

- [ ] Deployment status shows **"Success"** (green checkmark)
- [ ] Deployment took 5-10 minutes
- [ ] View Logs shows:
  - [ ] `✅ Connected to Redis`
  - [ ] `✅ Redis Client Ready`
  - [ ] `🚀 Crawler worker started`
  - [ ] `🌐 Server running on port 3000`
- [ ] No error messages in logs

---

## API Testing

### Test 1: Health Check
- [ ] Command run:
  ```bash
  curl https://your-app.up.railway.app/health
  ```
- [ ] Response received:
  ```json
  {
    "status": "ok",
    "redis": "connected",
    "timestamp": ...
  }
  ```

### Test 2: Create Crawl Job
- [ ] Command run:
  ```bash
  curl -X POST https://your-app.up.railway.app/crawl \
    -H "Content-Type: application/json" \
    -d '{"urls": ["http://www.sbworldtravel.com"], "maxRequests": 10}'
  ```
- [ ] Job ID received: `____________________________________`
- [ ] Status shows: `"queued"`

### Test 3: Check Job Status
- [ ] Command run:
  ```bash
  curl https://your-app.up.railway.app/jobs/{jobId}
  ```
- [ ] Status changed from `queued` → `running` → `completed`
- [ ] `processedUrls` > 0
- [ ] `failedUrls` = 0 (or very low)

### Test 4: Get Results
- [ ] Command run:
  ```bash
  curl https://your-app.up.railway.app/jobs/{jobId}/results
  ```
- [ ] Results contain:
  - [ ] `url` field
  - [ ] `title` field
  - [ ] `fullText` field
  - [ ] `crawledAt` timestamp
- [ ] Results look correct and complete

---

## Monitoring Setup

- [ ] Metrics tab checked (CPU, Memory, Network)
- [ ] Memory usage under 3.5GB
- [ ] CPU usage between 40-80%
- [ ] No memory leaks observed
- [ ] Browser retirement working (check logs)

---

## Optional: Alerts & Notifications

- [ ] Slack/Discord connected (Settings > Notifications)
- [ ] Deployment failure alerts enabled
- [ ] High memory usage alerts enabled
- [ ] Service crash alerts enabled

---

## Cost Management

- [ ] Billing dashboard reviewed
- [ ] Expected cost: ~$25-30/month verified
- [ ] Spending limit set (if desired)
- [ ] Billing email alerts enabled

---

## Documentation

- [ ] Railway dashboard URL saved: `https://railway.app/project/_______________`
- [ ] API endpoint URL saved: `https://_____________________________.up.railway.app`
- [ ] Job IDs from test crawls saved (for reference)
- [ ] Environment variables backed up securely
- [ ] Deployment date recorded: `_______________`

---

## Production Readiness

- [ ] All tests passing (health, create, status, results)
- [ ] No errors in logs for 5+ minutes
- [ ] Multiple test crawls completed successfully
- [ ] Resource usage stable
- [ ] Proxy working (check Webshare dashboard)
- [ ] Response times acceptable (<2s for API calls)
- [ ] Crawling speed acceptable (~37s per page)

---

## Troubleshooting Reference

### If service won't start:
- [ ] All environment variables set correctly?
- [ ] REDIS_URL format: `${{Redis.REDIS_URL}}`?
- [ ] View logs for error messages
- [ ] Redis service is running (green)?

### If out of memory:
- [ ] Increase memory to 6GB or 8GB
- [ ] Lower MAX_CONCURRENCY to 8
- [ ] Check for memory leaks in logs
- [ ] Restart service

### If jobs stuck in "queued":
- [ ] Logs show "Crawler worker started"?
- [ ] Redis connection active?
- [ ] Restart crawler service
- [ ] Check Redis service health

### If crawling is slow:
- [ ] Increase MAX_CONCURRENCY (if memory allows)
- [ ] Check Webshare proxy dashboard
- [ ] Verify target websites are responsive
- [ ] Check CPU usage isn't maxed

---

## Post-Deployment

- [ ] Share API documentation with team
- [ ] Set up monitoring dashboard (optional)
- [ ] Schedule regular health checks
- [ ] Plan for scaling if needed
- [ ] Document any custom configurations

---

## Success Criteria

Your deployment is successful when:
- ✅ Health check returns 200 OK
- ✅ Can create crawl jobs via API
- ✅ Jobs transition: queued → running → completed
- ✅ Results are accurate and complete
- ✅ No errors in logs
- ✅ Memory usage stable (<3.5GB)
- ✅ Can handle continuous requests
- ✅ Crawling ~100,000 pages/day capacity

---

## Emergency Contacts

- Railway Status: https://status.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app
- Webshare Support: https://webshare.io/support

---

## Next Steps After Deployment

1. **Monitor for 24 hours** to ensure stability
2. **Run load tests** with more concurrent jobs
3. **Optimize settings** based on actual usage
4. **Set up automated monitoring** (optional)
5. **Document any custom workflows** for your team
6. **Plan scaling strategy** if you need >100K pages/day

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Railway Project URL:** _______________________________________________
**API Endpoint:** _______________________________________________

---

## Deployment Complete! 🎉

Your crawler is now production-ready and deployed to Railway.

**Capacity:** 100,000+ pages per day
**Cost:** ~$25-30/month
**Uptime:** 24/7 with auto-restart
**Support:** Railway Discord & Docs

**Well done!** 🚀
