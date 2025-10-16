import axios from 'axios';

console.log('Testing crawler API...\n');

const baseURL = 'http://localhost:3000';

async function test() {
    try {
        // Test health
        const health = await axios.get(`${baseURL}/health`);
        console.log('✅ Health:', health.data);

        // Create job
        console.log('\n📝 Creating crawl job...');
        const jobResponse = await axios.post(`${baseURL}/crawl`, {
            urls: ['http://www.sbworldtravel.com'],
            maxRequests: 3
        }, { timeout: 5000 });

        console.log('✅ Job created:', JSON.stringify(jobResponse.data, null, 2));
        const jobId = jobResponse.data.jobId;

        // Check status immediately
        await new Promise(r => setTimeout(r, 5000));
        const status = await axios.get(`${baseURL}/jobs/${jobId}`);
        console.log('\n📊 Job status:', JSON.stringify(status.data, null, 2));

        // Wait and check results
        console.log('\n⏳ Waiting 30 seconds for crawl to complete...');
        await new Promise(r => setTimeout(r, 30000));

        const results = await axios.get(`${baseURL}/jobs/${jobId}/results?limit=2`);
        console.log('\n📦 Results:', JSON.stringify(results.data, null, 2));

        console.log('\n✅ Test completed successfully!');
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        process.exit(1);
    }
}

test();
