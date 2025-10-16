import { createApp } from './api.js';
import { CrawlerWorker } from './crawler-worker.js';
import { getRedisClient, closeRedis } from './redis-client.js';
import { config } from './config.js';

let server;
let worker;

async function start() {
    try {
        console.log('🚀 Starting Crawlee API Server...');

        // Initialize Redis connection
        const redis = getRedisClient();
        await redis.ping();
        console.log('✅ Redis connected');

        // Create Express app
        const app = createApp();

        // Start server
        server = app.listen(config.port, () => {
            console.log(`🌐 Server running on port ${config.port}`);
            console.log(`📍 Environment: ${config.nodeEnv}`);
            console.log(`🔗 Health check: http://localhost:${config.port}/health`);
        });

        // Handle server errors
        server.on('error', (err) => {
            console.error('❌ Server error:', err);
            process.exit(1);
        });

        // Start crawler worker
        worker = new CrawlerWorker();
        worker.start().catch((error) => {
            console.error('❌ Worker error:', error);
        });

        console.log('✅ Crawler worker started');
        console.log('🎉 All systems ready!');
    } catch (error) {
        console.error('❌ Startup error:', error);
        process.exit(1);
    }
}

async function shutdown(signal) {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    const shutdownTimeout = setTimeout(() => {
        console.error('⚠️  Graceful shutdown timed out, forcing exit');
        process.exit(1);
    }, 30000); // 30 second timeout

    try {
        // Stop accepting new requests
        if (server) {
            await new Promise((resolve) => {
                server.close(resolve);
            });
            console.log('✅ HTTP server closed');
        }

        // Stop crawler worker
        if (worker) {
            await worker.stop();
            console.log('✅ Crawler worker stopped');
        }

        // Close Redis connection
        await closeRedis();
        console.log('✅ Redis connection closed');

        clearTimeout(shutdownTimeout);
        console.log('👋 Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        clearTimeout(shutdownTimeout);
        process.exit(1);
    }
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('UNHANDLED_REJECTION');
});

// Start the application
start();
