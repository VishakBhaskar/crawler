# Railway Deployment Architecture

Visual guide to understand how your crawler works on Railway.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         RAILWAY CLOUD                            │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    YOUR PROJECT                             │ │
│  │                                                              │ │
│  │  ┌──────────────────┐         ┌──────────────────┐         │ │
│  │  │  Redis Database  │◄────────┤  Crawler Service │         │ │
│  │  │                  │         │                  │         │ │
│  │  │  • Job Queue     │         │  • API Server    │         │ │
│  │  │  • Results Cache │         │  • Worker Process│         │ │
│  │  │  • TTL: 2 days   │         │  • 4GB RAM       │         │ │
│  │  │                  │         │  • 4 vCPU        │         │ │
│  │  └──────────────────┘         └──────────────────┘         │ │
│  │                                         │                    │ │
│  │                                         │                    │ │
│  │                                ┌────────▼────────┐          │ │
│  │                                │  Public Domain  │          │ │
│  │                                │  (your-app.up   │          │ │
│  │                                │  .railway.app)  │          │ │
│  │                                └────────┬────────┘          │ │
│  └─────────────────────────────────────────┼──────────────────┘ │
│                                             │                    │
└─────────────────────────────────────────────┼────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
              ┌─────▼─────┐           ┌─────▼─────┐           ┌───────▼───────┐
              │   User 1  │           │   User 2  │           │  Your App     │
              │           │           │           │           │               │
              │  POST /   │           │  GET /    │           │  Automation   │
              │  crawl    │           │  results  │           │  Scripts      │
              └───────────┘           └───────────┘           └───────────────┘
```

---

## Request Flow

### 1. Create Crawl Job
```
User → Railway Public URL → API Server → Redis Job Queue
                                   ↓
                              Return Job ID
                                   ↓
                            User ← Response
```

**What happens:**
1. User sends POST /crawl request
2. API validates request
3. Creates job in Redis queue
4. Returns job ID immediately (no waiting!)
5. User can continue working

### 2. Background Processing
```
Worker Process → Check Redis Queue → Found Job?
     ↓                                    ↓ YES
     │                          Launch Browser
     │                                    ↓
     │                          Navigate to URL
     │                                    ↓
     │                          Extract Data
     │                                    ↓
     │                          Save to Redis
     │                                    ↓
     │                          Update Job Status
     │                                    ↓
     └──────────────────────────────────┘
              (Loop continues)
```

**What happens:**
1. Worker constantly polls Redis for new jobs
2. When found, launches browser (Firefox + Camoufox)
3. Connects through proxy (Webshare)
4. Crawls the website
5. Extracts title and full text
6. Saves results to Redis
7. Updates job status to "completed"
8. Goes back to step 1

### 3. Get Results
```
User → GET /jobs/{id}/results → API Server → Redis
                                       ↓
                                 Fetch Results
                                       ↓
                                 User ← JSON
```

**What happens:**
1. User requests results with job ID
2. API fetches from Redis
3. Returns paginated results
4. User can request more pages if needed

---

## Component Details

### Crawler Service Container

```
┌─────────────────────────────────────┐
│     Crawler Container (4GB)         │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      Express API (Port 3000)│   │
│  │  • POST /crawl              │   │
│  │  • GET /jobs/:id            │   │
│  │  • GET /jobs/:id/results    │   │
│  │  • GET /health              │   │
│  └─────────────────────────────┘   │
│               │                     │
│               │                     │
│  ┌────────────▼────────────────┐   │
│  │    Background Worker        │   │
│  │  • Polls Redis queue        │   │
│  │  • Manages browser pool     │   │
│  │  • Handles 12 concurrent    │   │
│  │    crawl jobs               │   │
│  └────────────┬────────────────┘   │
│               │                     │
│               │                     │
│  ┌────────────▼────────────────┐   │
│  │    Browser Pool             │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐│   │
│  │  │ FF 1 │ │ FF 2 │ │ FF 3 ││   │
│  │  └──────┘ └──────┘ └──────┘│   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐│   │
│  │  │ FF 4 │ │ FF 5 │ │ FF 6 ││   │
│  │  └──────┘ └──────┘ └──────┘│   │
│  │  ... up to 12 browsers      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Redis Database

```
┌─────────────────────────────────┐
│         Redis Database          │
│                                 │
│  Jobs Hash (job:{id})           │
│  ├─ job:abc-123                 │
│  │  ├─ status: "completed"      │
│  │  ├─ urls: ["http://..."]     │
│  │  ├─ processedUrls: 10        │
│  │  ├─ failedUrls: 0            │
│  │  └─ createdAt: 1234567890    │
│  └─ job:def-456                 │
│     └─ status: "running"        │
│                                 │
│  Job Queue (List)               │
│  ├─ [job:abc-123]               │
│  ├─ [job:def-456]               │
│  └─ [job:ghi-789]               │
│                                 │
│  Results (job:{id}:result:{n})  │
│  ├─ job:abc-123:result:0        │
│  │  ├─ url: "http://..."        │
│  │  ├─ title: "Page Title"      │
│  │  └─ fullText: "..."          │
│  └─ job:abc-123:result:1        │
│                                 │
│  Expiration (TTL)               │
│  └─ All data expires after      │
│     172800 seconds (2 days)     │
└─────────────────────────────────┘
```

---

## Network Flow with Proxy

```
Railway Crawler → Webshare Proxy → Target Website
                  (rotating)

     ┌────────────────────────────────────────┐
     │  Webshare Proxy Pool                   │
     │  ┌──────┐  ┌──────┐  ┌──────┐         │
     │  │ IP 1 │  │ IP 2 │  │ IP 3 │  ...    │
     │  └──────┘  └──────┘  └──────┘         │
     └────────────────────────────────────────┘
              │         │         │
              ▼         ▼         ▼
         Website sees different IPs each request
         (prevents blocking & rate limiting)
```

**Why Proxy Matters:**
- Target websites see different IPs
- Prevents rate limiting
- Avoids IP bans
- Enables higher throughput
- Maintains anonymity

---

## Resource Allocation

### 4GB / 4vCPU Configuration

```
Total: 4GB RAM
├─ System overhead:     ~500MB   (12%)
├─ Node.js process:     ~300MB   (8%)
├─ Redis client:        ~100MB   (2%)
├─ Express API:         ~200MB   (5%)
└─ Browser pool:        ~2.9GB   (73%)
   ├─ Browser 1:        ~240MB
   ├─ Browser 2:        ~240MB
   ├─ Browser 3:        ~240MB
   ├─ Browser 4:        ~240MB
   ├─ Browser 5:        ~240MB
   ├─ Browser 6:        ~240MB
   ├─ Browser 7:        ~240MB
   ├─ Browser 8:        ~240MB
   ├─ Browser 9:        ~240MB
   ├─ Browser 10:       ~240MB
   ├─ Browser 11:       ~240MB
   └─ Browser 12:       ~240MB

Total CPU: 4 vCPU
├─ API Server:          0.5 vCPU  (12%)
├─ Worker polling:      0.5 vCPU  (12%)
└─ Browsers (12):       3.0 vCPU  (76%)
   └─ Each: ~0.25 vCPU
```

---

## Scaling Strategies

### Vertical Scaling (Increase Resources)
```
2GB RAM      →    4GB RAM     →    8GB RAM
4-6 browsers      12 browsers      24 browsers
~40K pages/day    ~100K/day        ~200K/day
$15/month         $30/month        $60/month
```

### Horizontal Scaling (Add More Workers)
```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Worker 1   │   │  Worker 2   │   │  Worker 3   │
│  4GB RAM    │   │  4GB RAM    │   │  4GB RAM    │
│  12 browsers│   │  12 browsers│   │  12 browsers│
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                  ┌──────▼──────┐
                  │    Redis    │
                  │ (Shared)    │
                  └─────────────┘

Total: ~300K pages/day, $90/month
```

---

## Data Flow Timeline

```
Time: 0s
User creates job → Job ID returned immediately

Time: 0-5s
Worker picks up job → Starts browser

Time: 5-35s
Browser navigates → Page loads → Data extracted

Time: 35s
Results saved to Redis → Job marked "completed"

Time: 0-172800s (2 days)
Data available in Redis

Time: >172800s
Data automatically expires (TTL cleanup)
```

---

## Monitoring Points

### Health Checks
```
Railway → GET /health (every 30s)
         ├─ API responding? ✓
         ├─ Redis connected? ✓
         └─ Worker active? ✓
```

### Metrics to Watch
```
Memory Usage:     < 3.5GB (safe zone)
CPU Usage:        40-80% (optimal)
Redis Memory:     < 100MB (normal)
Active Browsers:  1-12 (concurrent)
Queue Length:     0-100 (healthy)
Success Rate:     > 98% (good)
```

---

## Cost Breakdown

```
Railway Monthly Bill
├─ Base Plan:              $5.00
├─ Compute (4GB × 730h):  $20.00
├─ Redis (256MB):          $2.00
├─ Bandwidth (~50GB):      $3.00
└─ Total:                 ~$30.00

Per Page Cost:
$30 ÷ 100,000 pages = $0.0003/page
```

---

This architecture is designed for:
✅ High throughput (100K+ pages/day)
✅ Reliability (auto-restart, health checks)
✅ Scalability (vertical & horizontal)
✅ Cost efficiency ($0.0003/page)
✅ Maintainability (simple, clear separation)
