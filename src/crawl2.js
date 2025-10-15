import { PlaywrightCrawler } from 'crawlee';

const crawler = new PlaywrightCrawler({
    launchContext: {
        launchOptions: { headless: true },
    },

    maxRequestsPerCrawl: 5,

    async requestHandler({ pushData, request, page, enqueueLinks, log }) {
        log.info(`Processing ${request.url}...`);

        const data = {
            url: request.loadedUrl,
            title: await page.title(),
            fullText: await page.evaluate(() => document.body.innerText),
        };

        await pushData(data);

        // Optionally: follow links within the same site
        await enqueueLinks();
    },

    failedRequestHandler({ request, log }) {
        log.info(`Request ${request.url} failed too many times.`);
    },
});

await crawler.addRequests(['http://www.mfcbenefits.com']);
await crawler.run();

console.log('Crawler finished.');
