# Docker Hub to Railway Deployment Guide

This guide covers testing locally with Docker, pushing to Docker Hub, and deploying to Railway.

## Part 1: Local Testing with Docker

### Prerequisites
- Docker Desktop installed
- Docker Compose installed
- `.env` file configured with your settings

### Step 1: Configure Environment

1. Create your `.env` file:
```bash
cp .env.example .env
```

2. Update `.env` with your actual values:
```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Redis Configuration (will be overridden in docker-compose)
REDIS_URL=redis://redis:6379

# YOUR PROXY HERE
PROXY_URL=http://username:password@your-proxy.com:8080

# Crawler Settings
MAX_CONCURRENCY=5
MAX_REQUESTS_PER_MINUTE=30
DEFAULT_MAX_REQUESTS=100
```

### Step 2: Build and Test Locally

#### Option A: Using Docker Compose (Recommended)

```bash
# Start all services (crawler + Redis)
docker-compose up -d

# Watch logs
docker-compose logs -f crawler

# Check health
curl http://localhost:3000/health
```

#### Option B: Run Test Script

**On Windows:**
```bash
test-local.bat
```

**On Linux/Mac:**
```bash
chmod +x test-local.sh
./test-local.sh
```

### Step 3: Test the API

#### Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "environment": "production"
}
```

#### Create a Test Job
```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d "{\"urls\": [\"https://example.com\"], \"maxRequests\": 5}"
```

Expected response:
```json
{
  "jobId": "abc-123-def",
  "message": "Job created successfully",
  "status": "queued",
  "checkStatus": "/jobs/abc-123-def"
}
```

#### Check Job Status
```bash
curl http://localhost:3000/jobs/YOUR_JOB_ID
```

#### Get Results
```bash
curl http://localhost:3000/jobs/YOUR_JOB_ID/results
```

### Step 4: Verify Proxy is Working

1. Watch the crawler logs:
```bash
docker-compose logs -f crawler
```

2. Look for proxy-related messages when crawling

3. You can also check Redis to see stored data:
```bash
# Connect to Redis
docker exec -it crawler-redis redis-cli

# List all keys
KEYS *

# Get a job
GET job:YOUR_JOB_ID

# Exit
exit
```

### Step 5: Stop Services

```bash
# Stop services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

---

## Part 2: Push to Docker Hub

### Prerequisites
- Docker Hub account (create at https://hub.docker.com)
- Docker CLI logged in

### Step 1: Login to Docker Hub

```bash
docker login
# Enter your Docker Hub username and password
```

### Step 2: Build the Image

```bash
# Build for your platform
docker build -t yourusername/crawlee-api:latest .

# Or build for multiple platforms (recommended for Railway)
docker buildx build --platform linux/amd64,linux/arm64 -t yourusername/crawlee-api:latest . --push
```

**Note:** Replace `yourusername` with your actual Docker Hub username.

### Step 3: Tag the Image (if needed)

```bash
# Latest tag
docker tag yourusername/crawlee-api:latest yourusername/crawlee-api:v1.0.0

# Create a version tag
docker tag yourusername/crawlee-api:latest yourusername/crawlee-api:v1.0.0
```

### Step 4: Push to Docker Hub

```bash
# Push latest
docker push yourusername/crawlee-api:latest

# Push version tag
docker push yourusername/crawlee-api:v1.0.0
```

### Step 5: Verify on Docker Hub

1. Go to https://hub.docker.com
2. Navigate to your repositories
3. Verify the image is uploaded

---

## Part 3: Deploy to Railway from Docker Hub

### Prerequisites
- Railway account (https://railway.app)
- Docker image pushed to Docker Hub
- Redis database on Railway

### Method 1: Using Railway Dashboard (Easiest)

#### Step 1: Create New Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Empty Project"**

#### Step 2: Add Redis

1. In your new project, click **"New"**
2. Select **"Database"**
3. Choose **"Add Redis"**
4. Redis will be created with `REDIS_URL` auto-configured

#### Step 3: Add Your Docker Image

1. In the same project, click **"New"**
2. Select **"Docker Image"**
3. Enter your Docker Hub image: `yourusername/crawlee-api:latest`
4. Railway will pull and deploy your image

#### Step 4: Configure Environment Variables

1. Click on your crawler service
2. Go to **"Variables"** tab
3. Add these variables:

```bash
# Required
PROXY_URL=http://username:password@your-proxy.com:8080

# Optional (tune for your needs)
MAX_CONCURRENCY=5
MAX_REQUESTS_PER_MINUTE=30
DEFAULT_MAX_REQUESTS=100
MAX_LINKS_PER_PAGE=3
PAGE_TIMEOUT=30000
NODE_ENV=production
```

**Important:** Railway automatically provides:
- `PORT` - Don't set this
- `REDIS_URL` - Auto-set when you add Redis

#### Step 5: Generate Domain

1. Go to **"Settings"** tab
2. Scroll to **"Networking"**
3. Click **"Generate Domain"**
4. Your API will be available at: `https://your-app.railway.app`

#### Step 6: Monitor Deployment

1. Go to **"Deployments"** tab
2. Watch the deployment logs
3. Wait for "All systems ready!" message

### Method 2: Using Railway CLI

#### Install Railway CLI

```bash
# macOS/Linux
curl -fsSL https://railway.app/install.sh | sh

# Windows (PowerShell)
iwr https://railway.app/install.ps1 | iex
```

#### Deploy

```bash
# Login
railway login

# Create new project
railway init

# Add Redis
railway add redis

# Deploy from Docker image
railway up --image yourusername/crawlee-api:latest

# Set environment variables
railway variables set PROXY_URL="http://user:pass@proxy.com:8080"
railway variables set MAX_CONCURRENCY=5
railway variables set MAX_REQUESTS_PER_MINUTE=30

# Generate domain
railway domain
```

---

## Part 4: Testing Your Railway Deployment

### Test Health Endpoint

```bash
curl https://your-app.railway.app/health
```

### Create a Job

```bash
curl -X POST https://your-app.railway.app/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://example.com"],
    "maxRequests": 10
  }'
```

### Check Job Status

```bash
curl https://your-app.railway.app/jobs/YOUR_JOB_ID
```

### Get Results

```bash
curl https://your-app.railway.app/jobs/YOUR_JOB_ID/results
```

---

## Part 5: Updating Your Deployment

### Update Process

1. Make changes to your code
2. Build and push new image:
   ```bash
   docker build -t yourusername/crawlee-api:latest .
   docker push yourusername/crawlee-api:latest
   ```
3. Railway will auto-detect and redeploy (if auto-deploy is enabled)

   **OR manually trigger:**
   - Go to Railway dashboard
   - Click on your service
   - Go to "Deployments" tab
   - Click "Deploy"

### Version Tags (Recommended)

Use version tags for better control:

```bash
# Build with version
docker build -t yourusername/crawlee-api:v1.0.1 .
docker push yourusername/crawlee-api:v1.0.1

# Also tag as latest
docker tag yourusername/crawlee-api:v1.0.1 yourusername/crawlee-api:latest
docker push yourusername/crawlee-api:latest
```

---

## Part 6: Monitoring and Debugging

### View Logs in Railway

1. Go to your Railway project
2. Click on your service
3. Go to **"Deployments"** tab
4. Click on latest deployment
5. View real-time logs

### Important Log Messages

- `✅ Redis connected` - System ready
- `✅ Crawler worker started` - Worker running
- `📋 Processing job: <id>` - Job started
- `✅ Job <id> completed` - Job finished
- `❌ Job <id> failed` - Job error

### Check Redis Data

```bash
# Railway CLI
railway run redis-cli

# Or connect directly using REDIS_URL from Railway variables
redis-cli -u $REDIS_URL
```

---

## Part 7: Troubleshooting

### Issue: Image fails to pull

**Cause:** Private repository or wrong image name

**Solution:**
1. Make sure your Docker Hub repository is public
2. Verify image name: `yourusername/crawlee-api:latest`
3. Check Docker Hub for correct spelling

### Issue: "Unable to start browser" in Railway

**Cause:** Not enough resources

**Solutions:**
1. Reduce concurrency in environment variables:
   ```bash
   MAX_CONCURRENCY=2
   MAX_BROWSER_INSTANCES=1
   ```
2. Upgrade Railway plan (Pro plan recommended)

### Issue: Redis connection fails

**Check:**
1. Is Redis service running in Railway?
2. Is `REDIS_URL` automatically set?
3. Check logs for connection errors

### Issue: App crashes after few requests

**Cause:** Memory limit exceeded

**Solutions:**
1. Reduce `MAX_CONCURRENCY` and `MAX_BROWSER_INSTANCES`
2. Upgrade Railway plan for more RAM
3. Check logs for memory errors

---

## Part 8: Best Practices

### 1. Use Version Tags

Always push with both version and latest tags:
```bash
docker build -t yourusername/crawlee-api:v1.0.0 .
docker tag yourusername/crawlee-api:v1.0.0 yourusername/crawlee-api:latest
docker push yourusername/crawlee-api:v1.0.0
docker push yourusername/crawlee-api:latest
```

### 2. Resource Limits

Start conservative, scale up as needed:
```bash
# Conservative (512MB-1GB RAM)
MAX_CONCURRENCY=2
MAX_BROWSER_INSTANCES=1
MAX_REQUESTS_PER_MINUTE=10

# Medium (2-4GB RAM)
MAX_CONCURRENCY=5
MAX_BROWSER_INSTANCES=2
MAX_REQUESTS_PER_MINUTE=30

# High (8GB+ RAM)
MAX_CONCURRENCY=10
MAX_BROWSER_INSTANCES=5
MAX_REQUESTS_PER_MINUTE=70
```

### 3. Monitor Regularly

- Check Railway metrics for memory/CPU usage
- Monitor logs for errors
- Test health endpoint regularly

### 4. Secure Your API

Add authentication (not included in base implementation):
- Use API keys
- Implement rate limiting per client
- Use Railway's private networking

---

## Quick Reference Commands

### Local Development
```bash
# Start
docker-compose up -d

# Logs
docker-compose logs -f crawler

# Stop
docker-compose down

# Clean restart
docker-compose down -v && docker-compose up -d
```

### Docker Hub
```bash
# Build and push
docker build -t yourusername/crawlee-api:latest .
docker push yourusername/crawlee-api:latest

# Multi-platform build and push
docker buildx build --platform linux/amd64,linux/arm64 \
  -t yourusername/crawlee-api:latest . --push
```

### Railway CLI
```bash
# Login
railway login

# View logs
railway logs

# Set variables
railway variables set KEY=VALUE

# Deploy
railway up --image yourusername/crawlee-api:latest
```

---

## Cost Estimation

### Railway Pricing

- **Hobby Plan ($5/mo)**: 512MB RAM - Not recommended for production
- **Pro Plan ($20/mo + usage)**: 8GB RAM - Recommended for 100k+ pages/day
- **Redis**: Included in usage costs

### Docker Hub

- **Free Tier**: Unlimited public repositories
- **Pro ($5/mo)**: Unlimited private repositories + faster pulls

### Total Estimated Cost

- **Small scale** (<1000 pages/day): $5-10/month
- **Medium scale** (10k pages/day): $30-50/month
- **Large scale** (100k+ pages/day): $80-150/month

---

## Support

For issues:
1. Check logs in Railway dashboard
2. Test locally first with `docker-compose`
3. Review troubleshooting section
4. Check environment variables are set correctly
