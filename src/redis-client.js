import Redis from 'ioredis';
import { config } from './config.js';

let redisClient = null;
let workerRedisClient = null;

export function getRedisClient() {
    if (!redisClient) {
        redisClient = new Redis(config.redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            reconnectOnError(err) {
                const targetError = 'READONLY';
                if (err.message.includes(targetError)) {
                    return true;
                }
                return false;
            },
        });

        redisClient.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });

        redisClient.on('connect', () => {
            console.log('✅ Connected to Redis');
        });

        redisClient.on('ready', () => {
            console.log('✅ Redis Client Ready');
        });
    }

    return redisClient;
}

// Separate Redis client for worker to avoid blocking the API with brpop
export function getWorkerRedisClient() {
    if (!workerRedisClient) {
        workerRedisClient = new Redis(config.redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            reconnectOnError(err) {
                const targetError = 'READONLY';
                if (err.message.includes(targetError)) {
                    return true;
                }
                return false;
            },
        });

        workerRedisClient.on('error', (err) => {
            console.error('Worker Redis Client Error:', err);
        });

        workerRedisClient.on('connect', () => {
            console.log('✅ Connected to Redis (Worker)');
        });

        workerRedisClient.on('ready', () => {
            console.log('✅ Worker Redis Client Ready');
        });
    }

    return workerRedisClient;
}

export async function closeRedis() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        console.log('Redis connection closed');
    }
    if (workerRedisClient) {
        await workerRedisClient.quit();
        workerRedisClient = null;
        console.log('Worker Redis connection closed');
    }
}

// Cleanup old data (runs every 2 days)
export async function cleanupOldData() {
    const redis = getRedisClient();
    const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);

    try {
        // Get all job keys
        const jobKeys = await redis.keys('job:*');

        let deletedCount = 0;
        for (const key of jobKeys) {
            const job = await redis.get(key);
            if (job) {
                const jobData = JSON.parse(job);
                if (jobData.createdAt < twoDaysAgo) {
                    // Delete job and its results
                    await redis.del(key);
                    await redis.del(`results:${jobData.id}`);
                    deletedCount++;
                }
            }
        }

        console.log(`🧹 Cleanup completed: Deleted ${deletedCount} old jobs`);
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

// Run cleanup every 12 hours
setInterval(cleanupOldData, 12 * 60 * 60 * 1000);
