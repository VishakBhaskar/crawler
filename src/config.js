export const config = {
    port: process.env.PORT || 3000,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    proxyUrl: process.env.PROXY_URL,
    nodeEnv: process.env.NODE_ENV || 'development',

    // Crawler settings
    crawler: {
        maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '5'),
        maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '30'),
        defaultMaxRequests: parseInt(process.env.DEFAULT_MAX_REQUESTS || '100'),
        maxLinksPerPage: parseInt(process.env.MAX_LINKS_PER_PAGE || '3'),
        pageTimeout: parseInt(process.env.PAGE_TIMEOUT || '30000'),
    },

    // Job settings
    job: {
        defaultTtl: parseInt(process.env.JOB_TTL || '172800'), // 2 days in seconds
        resultsTtl: parseInt(process.env.RESULTS_TTL || '172800'), // 2 days
        maxJobsPerRequest: parseInt(process.env.MAX_JOBS_PER_REQUEST || '1000'),
    },

    // Browser pool settings
    browser: {
        maxInstances: parseInt(process.env.MAX_BROWSER_INSTANCES || '3'),
        instanceTimeout: parseInt(process.env.BROWSER_INSTANCE_TIMEOUT || '300000'), // 5 min
    },

    // Health check
    health: {
        checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000'), // 1 min
    }
};
