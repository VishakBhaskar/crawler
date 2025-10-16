import { PlaywrightCrawler, Configuration, ProxyConfiguration } from 'crawlee';
import { launchOptions } from 'camoufox-js';
import { firefox } from 'playwright';
import { JobManager } from './job-manager.js';
import { config } from './config.js';

export class CrawlerWorker {
    constructor() {
        this.jobManager = new JobManager();
        this.isRunning = false;
        this.currentCrawler = null;
        this.shouldStop = false;
    }

    async start() {
        this.isRunning = true;
        this.shouldStop = false;
        console.log('🚀 Crawler worker started');

        while (!this.shouldStop) {
            try {
                const job = await this.jobManager.getNextJob();

                if (!job) {
                    console.log('No jobs in queue, waiting...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                }

                console.log(`📋 Processing job: ${job.id}`);
                await this.processJob(job);
            } catch (error) {
                console.error('Worker error:', error);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        this.isRunning = false;
        console.log('🛑 Crawler worker stopped');
    }

    async processJob(job) {
        try {
            await this.jobManager.updateJob(job.id, {
                status: 'running',
                startedAt: Date.now(),
            });

            const proxyConfiguration = config.proxyUrl
                ? new ProxyConfiguration({
                      proxyUrls: [config.proxyUrl],
                  })
                : undefined;

            this.currentCrawler = new PlaywrightCrawler(
                {
                    proxyConfiguration,
                    useSessionPool: true,
                    sessionPoolOptions: { maxPoolSize: 50 },
                    persistCookiesPerSession: true,

                    maxConcurrency: config.crawler.maxConcurrency,
                    maxRequestsPerMinute: config.crawler.maxRequestsPerMinute,
                    maxRequestsPerCrawl: job.maxRequests,

                    // Request timeout
                    requestHandlerTimeoutSecs: Math.floor(config.crawler.pageTimeout / 1000),

                    postNavigationHooks: [
                        async ({ handleCloudflareChallenge }) => {
                            try {
                                await handleCloudflareChallenge();
                            } catch (error) {
                                console.warn('Cloudflare challenge handling failed:', error.message);
                            }
                        },
                    ],

                    browserPoolOptions: {
                        useFingerprints: false,
                        maxOpenPagesPerBrowser: 1,
                        retireBrowserAfterPageCount: 20, // Retire browser after 20 pages
                    },

                    launchContext: {
                        launcher: firefox,
                        launchOptions: await launchOptions({
                            headless: true,
                            args: [
                                '--no-sandbox',
                                '--disable-setuid-sandbox',
                                '--disable-dev-shm-usage',
                                '--disable-gpu',
                            ],
                        }),
                    },

                    async requestHandler({ request, page, enqueueLinks, log }) {
                        log.info(`URL: ${request.url}`);

                        try {
                            // Wait for page to be ready with timeout
                            await page.waitForLoadState('domcontentloaded', {
                                timeout: config.crawler.pageTimeout,
                            });

                            const title = await page.title();
                            const fullText = await page.evaluate(() => document.body.innerText);

                            const result = {
                                url: request.url,
                                title,
                                fullText,
                                crawledAt: Date.now(),
                            };

                            await this.jobManager.saveResult(job.id, result);

                            // Update progress
                            await this.jobManager.updateJob(job.id, {
                                processedUrls: (job.processedUrls || 0) + 1,
                            });

                            // Enqueue more links
                            try {
                                await page.waitForSelector('a', { timeout: 5000 });
                                await enqueueLinks({ limit: config.crawler.maxLinksPerPage });
                            } catch (error) {
                                log.debug('No links found or timeout');
                            }
                        } catch (error) {
                            log.error(`Error processing ${request.url}:`, error.message);
                            throw error;
                        }
                    },

                    async failedRequestHandler({ request, log }) {
                        log.error(`Request ${request.url} failed too many times.`);

                        await this.jobManager.updateJob(job.id, {
                            failedUrls: (job.failedUrls || 0) + 1,
                        });
                    },
                },
                new Configuration({
                    persistStorage: false,
                })
            );

            await this.currentCrawler.addRequests(job.urls);
            await this.currentCrawler.run();

            // Mark job as completed
            await this.jobManager.updateJob(job.id, {
                status: 'completed',
                completedAt: Date.now(),
            });

            console.log(`✅ Job ${job.id} completed`);
        } catch (error) {
            console.error(`❌ Job ${job.id} failed:`, error);

            await this.jobManager.updateJob(job.id, {
                status: 'failed',
                error: error.message,
                completedAt: Date.now(),
            });
        } finally {
            // Cleanup crawler instance
            if (this.currentCrawler) {
                try {
                    await this.currentCrawler.teardown();
                } catch (error) {
                    console.error('Error tearing down crawler:', error);
                }
                this.currentCrawler = null;
            }

            // Force garbage collection hint
            if (global.gc) {
                global.gc();
            }
        }
    }

    async stop() {
        console.log('🛑 Stopping crawler worker...');
        this.shouldStop = true;

        if (this.currentCrawler) {
            try {
                await this.currentCrawler.teardown();
            } catch (error) {
                console.error('Error stopping current crawler:', error);
            }
        }
    }
}
