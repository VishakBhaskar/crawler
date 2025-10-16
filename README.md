# Crawlee API - Production-Ready Web Crawler

A production-ready web crawler API built with Crawlee, Express, and Redis. Designed to handle high-volume crawling with proper job queuing, resource management, and fault tolerance.

## Features

- **Asynchronous Job Processing**: Submit crawl jobs and get results later
- **Redis Queue**: Distributed job queue for scalability
- **Browser Resource Management**: Automatic cleanup and limits
- **Graceful Shutdown**: Proper cleanup on shutdown
- **Auto Cleanup**: Jobs and results expire after 2 days
- **Proxy Support**: Configure HTTP/HTTPS proxies
- **Anti-Bot Detection**: Uses Camoufox for browser fingerprinting
- **Cloudflare Support**: Automatic Cloudflare challenge handling
- **RESTful API**: Clean and simple API design

## Quick Start

### Local Development

1. **Install dependencies:**
```bash
npm install
```

2. **Start Redis** (using Docker):
```bash
docker run -d -p 6379:6379 redis:alpine
```

3. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your settings
```

4. **Start the server:**
```bash
npm start
```

5. **Test the API:**
```bash
curl http://localhost:3000/health
```

## API Usage

### 1. Create a Crawl Job

```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://example.com", "https://example.org"],
    "maxRequests": 100
  }'
```

Response:
```json
{
  "jobId": "abc123-def456-789",
  "message": "Job created successfully",
  "status": "queued",
  "checkStatus": "/jobs/abc123-def456-789",
  "getResults": "/jobs/abc123-def456-789/results"
}
```

### 2. Check Job Status

```bash
curl http://localhost:3000/jobs/abc123-def456-789
```

Response:
```json
{
  "id": "abc123-def456-789",
  "status": "running",
  "processedUrls": 45,
  "failedUrls": 2,
  "totalUrls": 100,
  "createdAt": 1234567890,
  "startedAt": 1234567891,
  "resultsCount": 45
}
```

### 3. Get Results (Paginated)

```bash
curl "http://localhost:3000/jobs/abc123-def456-789/results?limit=10&offset=0"
```

Response:
```json
{
  "jobId": "abc123-def456-789",
  "results": [
    {
      "url": "https://example.com",
      "title": "Example Page",
      "fullText": "Page content...",
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
curl http://localhost:3000/jobs/abc123-def456-789/results/all
```

### 5. Delete a Job

```bash
curl -X DELETE http://localhost:3000/jobs/abc123-def456-789
```

## Configuration

All configuration is done via environment variables. See [.env.example](.env.example) for all options.

### Key Settings

```bash
# Server
PORT=3000
NODE_ENV=production

# Redis
REDIS_URL=redis://localhost:6379

# Proxy (optional)
PROXY_URL=http://username:password@proxy.example.com:8080

# Crawler Performance
MAX_CONCURRENCY=5              # Parallel pages
MAX_REQUESTS_PER_MINUTE=30     # Rate limit
DEFAULT_MAX_REQUESTS=100       # Default pages per job
MAX_LINKS_PER_PAGE=3          # Links to follow per page

# Data Retention
JOB_TTL=172800                 # 2 days in seconds
RESULTS_TTL=172800             # 2 days in seconds
```

## Architecture

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Client    │──────▶│  Express    │──────▶│   Redis     │
│             │◀──────│   API       │       │   Queue     │
└─────────────┘       └─────────────┘       └─────────────┘
                                                    │
                                                    ▼
                                            ┌─────────────┐
                                            │  Crawler    │
                                            │   Worker    │
                                            └─────────────┘
                                                    │
                                                    ▼
                                            ┌─────────────┐
                                            │   Results   │
                                            │   Storage   │
                                            └─────────────┘
```

### Components

1. **Express API** ([src/api.js](src/api.js))
   - Handles HTTP requests
   - Creates jobs
   - Retrieves results

2. **Job Manager** ([src/job-manager.js](src/job-manager.js))
   - Manages job lifecycle
   - Stores/retrieves jobs from Redis
   - Handles results storage

3. **Crawler Worker** ([src/crawler-worker.js](src/crawler-worker.js))
   - Processes jobs from queue
   - Runs Playwright crawlers
   - Manages browser instances

4. **Redis Client** ([src/redis-client.js](src/redis-client.js))
   - Redis connection management
   - Auto-cleanup of old data

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed Railway deployment instructions.

### Quick Deploy to Railway

1. Push your code to GitHub
2. Create new Railway project
3. Deploy from GitHub repo
4. Add Redis database
5. Set environment variables
6. Deploy!

## Performance Tuning

### For High Volume (100k+ pages/day)

```bash
MAX_CONCURRENCY=10
MAX_REQUESTS_PER_MINUTE=70
MAX_BROWSER_INSTANCES=5
DEFAULT_MAX_REQUESTS=10000
```

**Requirements:**
- 8GB+ RAM
- 4+ vCPU
- Fast proxy (if using)

### For Low Resources (512MB RAM)

```bash
MAX_CONCURRENCY=2
MAX_REQUESTS_PER_MINUTE=10
MAX_BROWSER_INSTANCES=1
DEFAULT_MAX_REQUESTS=50
```

## Troubleshooting

### Browser crashes or "Unable to start browser"

**Solution**: Reduce concurrency
```bash
MAX_CONCURRENCY=2
MAX_BROWSER_INSTANCES=1
```

### Jobs stuck in queue

**Check**: Is worker running?
```bash
# Look for this in logs:
✅ Crawler worker started
📋 Processing job: <id>
```

### Redis connection errors

**Check**: Is Redis running?
```bash
# Test Redis connection
redis-cli ping
# Should return: PONG
```

### Out of memory

**Solutions**:
1. Reduce `MAX_CONCURRENCY`
2. Reduce `MAX_BROWSER_INSTANCES`
3. Add more RAM to your server

## Development

### Project Structure

```
crawler/
├── src/
│   ├── main.js              # Entry point
│   ├── api.js               # Express API routes
│   ├── config.js            # Configuration
│   ├── crawler-worker.js    # Crawler worker
│   ├── job-manager.js       # Job management
│   └── redis-client.js      # Redis connection
├── Dockerfile               # Production Dockerfile
├── package.json
├── .env.example
├── DEPLOYMENT.md
└── README.md
```

### Running Tests

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

## Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

### Log Messages

- `✅ Redis connected` - System ready
- `📋 Processing job: <id>` - Job started
- `✅ Job <id> completed` - Job finished
- `❌ Job <id> failed` - Job error
- `🧹 Cleanup completed` - Old data removed

## License

ISC

## Contributing

Issues and pull requests welcome!

## Support

For issues, please check:
1. [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
2. Logs in Railway dashboard
3. This README's troubleshooting section
