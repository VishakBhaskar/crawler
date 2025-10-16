import express from 'express';
import { JobManager } from './job-manager.js';
import { config } from './config.js';

export function createApp() {
    const app = express();
    app.use(express.json({ limit: '10mb' }));

    const jobManager = new JobManager();

    // Health check endpoint
    app.get('/health', async (req, res) => {
        try {
            // Check Redis connection
            await jobManager.redis.ping();

            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                environment: config.nodeEnv,
            });
        } catch (error) {
            res.status(503).json({
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString(),
            });
        }
    });

    // Root endpoint
    app.get('/', (req, res) => {
        res.json({
            service: 'Crawlee API',
            version: '2.0.0',
            endpoints: {
                health: 'GET /health',
                createJob: 'POST /crawl',
                getJobStatus: 'GET /jobs/:jobId',
                getJobResults: 'GET /jobs/:jobId/results',
                getAllResults: 'GET /jobs/:jobId/results/all',
            },
        });
    });

    // Create a new crawl job
    app.post('/crawl', async (req, res) => {
        try {
            const { urls, maxRequests } = req.body;

            // Validation
            if (!urls || !Array.isArray(urls) || urls.length === 0) {
                return res.status(400).json({
                    error: 'Please provide an array of URLs to crawl.',
                });
            }

            if (urls.length > config.job.maxJobsPerRequest) {
                return res.status(400).json({
                    error: `Maximum ${config.job.maxJobsPerRequest} URLs per request.`,
                });
            }

            // Validate URLs
            const validUrls = urls.filter((url) => {
                try {
                    new URL(url);
                    return true;
                } catch {
                    return false;
                }
            });

            if (validUrls.length === 0) {
                return res.status(400).json({
                    error: 'No valid URLs provided.',
                });
            }

            // Create job
            const jobId = await jobManager.createJob(validUrls, maxRequests);

            res.status(202).json({
                jobId,
                message: 'Job created successfully',
                status: 'queued',
                urls: validUrls,
                checkStatus: `/jobs/${jobId}`,
                getResults: `/jobs/${jobId}/results`,
            });
        } catch (error) {
            console.error('Create job error:', error);
            res.status(500).json({
                error: 'Failed to create crawl job.',
                message: error.message,
            });
        }
    });

    // Get job status
    app.get('/jobs/:jobId', async (req, res) => {
        try {
            const { jobId } = req.params;
            const job = await jobManager.getJob(jobId);

            if (!job) {
                return res.status(404).json({
                    error: 'Job not found',
                    message: 'This job may have expired or does not exist.',
                });
            }

            const resultsCount = await jobManager.getResultsCount(jobId);

            res.json({
                ...job,
                resultsCount,
                links: {
                    self: `/jobs/${jobId}`,
                    results: `/jobs/${jobId}/results`,
                    allResults: `/jobs/${jobId}/results/all`,
                },
            });
        } catch (error) {
            console.error('Get job error:', error);
            res.status(500).json({
                error: 'Failed to get job status.',
                message: error.message,
            });
        }
    });

    // Get job results (paginated)
    app.get('/jobs/:jobId/results', async (req, res) => {
        try {
            const { jobId } = req.params;
            const limit = parseInt(req.query.limit) || 100;
            const offset = parseInt(req.query.offset) || 0;

            const job = await jobManager.getJob(jobId);

            if (!job) {
                return res.status(404).json({
                    error: 'Job not found',
                });
            }

            // Get results from Redis list with pagination
            const allResults = await jobManager.redis.lrange(
                `results:${jobId}`,
                offset,
                offset + limit - 1
            );

            const results = allResults.map((r) => JSON.parse(r));
            const totalCount = await jobManager.getResultsCount(jobId);

            res.json({
                jobId,
                results,
                pagination: {
                    offset,
                    limit,
                    count: results.length,
                    total: totalCount,
                    hasMore: offset + limit < totalCount,
                },
                job: {
                    status: job.status,
                    processedUrls: job.processedUrls,
                    failedUrls: job.failedUrls,
                },
            });
        } catch (error) {
            console.error('Get results error:', error);
            res.status(500).json({
                error: 'Failed to get results.',
                message: error.message,
            });
        }
    });

    // Get all results (use with caution for large jobs)
    app.get('/jobs/:jobId/results/all', async (req, res) => {
        try {
            const { jobId } = req.params;

            const job = await jobManager.getJob(jobId);

            if (!job) {
                return res.status(404).json({
                    error: 'Job not found',
                });
            }

            const results = await jobManager.getAllResults(jobId);

            res.json({
                jobId,
                results,
                count: results.length,
                job: {
                    status: job.status,
                    processedUrls: job.processedUrls,
                    failedUrls: job.failedUrls,
                },
            });
        } catch (error) {
            console.error('Get all results error:', error);
            res.status(500).json({
                error: 'Failed to get all results.',
                message: error.message,
            });
        }
    });

    // Delete job and its results
    app.delete('/jobs/:jobId', async (req, res) => {
        try {
            const { jobId } = req.params;

            const job = await jobManager.getJob(jobId);

            if (!job) {
                return res.status(404).json({
                    error: 'Job not found',
                });
            }

            await jobManager.deleteJob(jobId);

            res.json({
                message: 'Job deleted successfully',
                jobId,
            });
        } catch (error) {
            console.error('Delete job error:', error);
            res.status(500).json({
                error: 'Failed to delete job.',
                message: error.message,
            });
        }
    });

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            error: 'Not found',
            path: req.path,
        });
    });

    // Error handler
    app.use((err, req, res, next) => {
        console.error('Unhandled error:', err);
        res.status(500).json({
            error: 'Internal server error',
            message: config.nodeEnv === 'development' ? err.message : undefined,
        });
    });

    return app;
}
