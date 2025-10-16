import { getRedisClient } from './redis-client.js';
import { config } from './config.js';
import { v4 as uuidv4 } from 'uuid';

export class JobManager {
    constructor(redisClient = null) {
        this.redis = redisClient || getRedisClient();
    }

    async createJob(urls, maxRequests) {
        const jobId = uuidv4();
        const job = {
            id: jobId,
            urls,
            maxRequests: maxRequests || config.crawler.defaultMaxRequests,
            status: 'queued',
            totalUrls: 0,
            processedUrls: 0,
            failedUrls: 0,
            createdAt: Date.now(),
            startedAt: null,
            completedAt: null,
        };

        await this.redis.set(
            `job:${jobId}`,
            JSON.stringify(job),
            'EX',
            config.job.defaultTtl
        );

        // Add to processing queue
        await this.redis.lpush('job:queue', jobId);

        return jobId;
    }

    async getJob(jobId) {
        const jobData = await this.redis.get(`job:${jobId}`);
        return jobData ? JSON.parse(jobData) : null;
    }

    async updateJob(jobId, updates) {
        const job = await this.getJob(jobId);
        if (!job) return null;

        const updatedJob = { ...job, ...updates };
        await this.redis.set(
            `job:${jobId}`,
            JSON.stringify(updatedJob),
            'EX',
            config.job.defaultTtl
        );

        return updatedJob;
    }

    async getNextJob() {
        // Get job from queue (blocking pop with timeout)
        const result = await this.redis.brpop('job:queue', 0);
        if (!result) return null;

        const jobId = result[1];
        return await this.getJob(jobId);
    }

    async saveResult(jobId, result) {
        await this.redis.rpush(`results:${jobId}`, JSON.stringify(result));
        await this.redis.expire(`results:${jobId}`, config.job.resultsTtl);
    }

    async getResults(jobId, limit = 1000) {
        const results = await this.redis.lrange(`results:${jobId}`, 0, limit - 1);
        return results.map(r => JSON.parse(r));
    }

    async getAllResults(jobId) {
        const results = await this.redis.lrange(`results:${jobId}`, 0, -1);
        return results.map(r => JSON.parse(r));
    }

    async getResultsCount(jobId) {
        return await this.redis.llen(`results:${jobId}`);
    }

    async deleteJob(jobId) {
        await this.redis.del(`job:${jobId}`);
        await this.redis.del(`results:${jobId}`);
    }
}
