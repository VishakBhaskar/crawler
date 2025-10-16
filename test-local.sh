#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Crawlee API Local Testing Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please update .env with your actual PROXY_URL${NC}"
    echo -e "${YELLOW}⚠️  Then run this script again${NC}"
    exit 1
fi

# Start services
echo -e "${BLUE}🚀 Starting Docker services...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Check health
echo -e "\n${BLUE}🏥 Checking health endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
    echo -e "${GREEN}Response: $HEALTH_RESPONSE${NC}"
else
    echo -e "${RED}❌ Health check failed!${NC}"
    echo -e "${RED}Response: $HEALTH_RESPONSE${NC}"
    echo -e "\n${YELLOW}Showing logs:${NC}"
    docker-compose logs crawler
    exit 1
fi

# Test root endpoint
echo -e "\n${BLUE}📍 Testing root endpoint...${NC}"
ROOT_RESPONSE=$(curl -s http://localhost:3000/)
echo -e "${GREEN}Response:${NC}"
echo "$ROOT_RESPONSE" | jq '.' 2>/dev/null || echo "$ROOT_RESPONSE"

# Create a test job
echo -e "\n${BLUE}📝 Creating test crawl job...${NC}"
JOB_RESPONSE=$(curl -s -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://example.com"],
    "maxRequests": 5
  }')

echo -e "${GREEN}Job created:${NC}"
echo "$JOB_RESPONSE" | jq '.' 2>/dev/null || echo "$JOB_RESPONSE"

# Extract job ID
JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.jobId' 2>/dev/null)

if [ "$JOB_ID" != "null" ] && [ -n "$JOB_ID" ]; then
    echo -e "\n${GREEN}✅ Job ID: $JOB_ID${NC}"

    # Wait a bit for processing to start
    echo -e "\n${BLUE}⏳ Waiting 15 seconds for job to process...${NC}"
    sleep 15

    # Check job status
    echo -e "\n${BLUE}📊 Checking job status...${NC}"
    STATUS_RESPONSE=$(curl -s http://localhost:3000/jobs/$JOB_ID)
    echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"

    # Check for results
    echo -e "\n${BLUE}📦 Checking results...${NC}"
    RESULTS_RESPONSE=$(curl -s "http://localhost:3000/jobs/$JOB_ID/results?limit=10")
    echo "$RESULTS_RESPONSE" | jq '.' 2>/dev/null || echo "$RESULTS_RESPONSE"

    # Check if proxy is working (if configured)
    PROXY_URL=$(grep PROXY_URL .env | cut -d '=' -f2)
    if [ -n "$PROXY_URL" ] && [ "$PROXY_URL" != "http://username:password@proxy.example.com:8080" ]; then
        echo -e "\n${GREEN}✅ Proxy configured: $PROXY_URL${NC}"
        echo -e "${YELLOW}Check logs to verify proxy is being used${NC}"
    else
        echo -e "\n${YELLOW}⚠️  No proxy configured (using direct connection)${NC}"
    fi
else
    echo -e "\n${RED}❌ Failed to create job${NC}"
    exit 1
fi

# Show logs
echo -e "\n${BLUE}📋 Recent logs:${NC}"
docker-compose logs --tail=50 crawler

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Testing Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${BLUE}Useful commands:${NC}"
echo -e "  ${YELLOW}View logs:${NC}        docker-compose logs -f crawler"
echo -e "  ${YELLOW}Stop services:${NC}    docker-compose down"
echo -e "  ${YELLOW}Restart:${NC}          docker-compose restart"
echo -e "  ${YELLOW}Check health:${NC}     curl http://localhost:3000/health"
echo -e "  ${YELLOW}View Redis:${NC}       docker exec -it crawler-redis redis-cli"
