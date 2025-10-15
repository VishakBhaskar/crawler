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
    && rm -rf /var/lib/apt/lists/*

# Copy package files first (layer caching)
COPY package*.json ./

# Install app dependencies
RUN npm install --omit=dev

# Install Playwright browsers and Camoufox
RUN npx playwright install --with-deps && \
    npx camoufox fetch

# Copy source code
COPY . .

# Expose port for Railway
EXPOSE 3000

# Run the app
CMD ["node", "src/main.js"]
