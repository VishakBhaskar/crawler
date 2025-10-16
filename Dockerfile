# Use the official Node.js 20 image with Debian
FROM node:20-slim

# Set working directory
WORKDIR /app

# Environment variables
ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false

# Install required system dependencies for headless browsers
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libnss3 \
    libatk-bridge2.0-0 \
    libxkbcommon0 \
    libgtk-3-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first (layer caching)
COPY package*.json ./

# Install app dependencies
RUN npm install --omit=dev

# Install Playwright browsers (as root)
RUN npx playwright install firefox --with-deps

# Copy source code
COPY . .

# Create a non-root user for better security
RUN groupadd -r crawler && \
    useradd -r -g crawler -G audio,video crawler && \
    mkdir -p /home/crawler/.cache && \
    chown -R crawler:crawler /app /home/crawler /ms-playwright

# Switch to non-root user
USER crawler

# Install Camoufox as the crawler user and set permissions
RUN npx camoufox fetch && \
    chmod +x /home/crawler/.cache/camoufox/camoufox-bin

# Expose port for Railway
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Run the app
CMD ["node", "src/main.js"]
