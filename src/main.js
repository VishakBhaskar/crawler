import express from 'express';
import { PlaywrightCrawler, Configuration, ProxyConfiguration } from 'crawlee';
import { launchOptions } from 'camoufox-js';
import { firefox } from 'playwright';

const app = express();
app.use(express.json());

app.post('/crawl', async (req, res) => {
    try {
        const { urls, maxRequests } = req.body;

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ error: 'Please provide an array of URLs to crawl.' });
        }

        // Array to store results in memory
        const results = [];
        console.log("🚀 PROXY_URL:", process.env.PROXY_URL);


        // ✅ Proxy setup with username/password
        const proxyConfiguration = new ProxyConfiguration({
            proxyUrls: [
                process.env.PROXY_URL
            ]
        });

        const crawler = new PlaywrightCrawler(
            {
                proxyConfiguration,                     // ✅ use proxy
                useSessionPool: true,                   // ✅ enable session management
                sessionPoolOptions: { maxPoolSize: 100 },
                persistCookiesPerSession: true,

                maxConcurrency: 10,                     // ✅ concurrency
                maxRequestsPerMinute: 60,               // ✅ requests per minute
                maxRequestsPerCrawl: maxRequests || 5,

                // ✅ Camoufox setup
                postNavigationHooks: [
                    async ({ handleCloudflareChallenge }) => {
                        await handleCloudflareChallenge();
                    },
                ],
                browserPoolOptions: {
                    useFingerprints: false, // disable to avoid conflict with Camoufox
                },
                launchContext: {
                    launcher: firefox,
                    launchOptions: await launchOptions({
                        headless: true,
                    }),
                },

                async requestHandler({ request, page, enqueueLinks, log }) {
                    log.info(`URL: ${request.url}`);

                    const title = await page.title();
                    log.info(`Title: ${title}`);

                    const fullText = await page.evaluate(() => document.body.innerText);
                    log.info(`Full Text:\n${fullText}\n----------------------`);

                    results.push({
                        url: request.url,
                        title,
                        fullText
                    });

                    await page.waitForSelector('a', { timeout: 7000 }).catch(() => {}); 

                    await enqueueLinks({ limit: 3 });
                },

                failedRequestHandler({ request, log }) {
                    log.info(`Request ${request.url} failed too many times.`);
                },
            },
            new Configuration({
                persistStorage: false, // disables any file/disk storage
            })
        );

        await crawler.addRequests(urls);
        await crawler.run();

        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Crawl failed.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Crawler API running on port ${PORT}`)).on('error', (err) => console.error("Server failed:", err));
