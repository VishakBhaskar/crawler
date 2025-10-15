import express from 'express';
import { PlaywrightCrawler, Configuration } from 'crawlee';

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

        const crawler = new PlaywrightCrawler(
            {
                launchContext: { launchOptions: { headless: true } },
                maxRequestsPerCrawl: maxRequests || 5,

                async requestHandler({ request, page, enqueueLinks, log }) {
                    // Log the URL
                    log.info(`URL: ${request.url}`);

                    // Get the page title
                    const title = await page.title();
                    log.info(`Title: ${title}`);

                    // Get the full text of the page
                    const fullText = await page.evaluate(() => document.body.innerText);
                    log.info(`Full Text:\n${fullText}\n----------------------`);

                    // Add data to results array
                    results.push({
                        url: request.url,
                        title,
                        fullText
                    });

                    // Optionally follow internal links
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

        // Return the collected data in the response
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Crawl failed.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Crawler API running on port ${PORT}`));



