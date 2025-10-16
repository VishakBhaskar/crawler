// Simple test script to run inside the container
const http = require('http');

const url = 'http://www.sbworldtravel.com';

console.log('Testing API from inside container...\n');

// Test 1: Health check
const healthReq = http.get('http://localhost:3000/health', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('✅ Health check:', data);

        // Test 2: Create crawl job
        const postData = JSON.stringify({
            urls: [url],
            maxRequests: 3
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/crawl',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length
            }
        };

        console.log('\n📝 Creating crawl job for:', url);

        const postReq = http.request(options, (res) => {
            let jobData = '';
            res.on('data', (chunk) => jobData += chunk);
            res.on('end', () => {
                console.log('\n✅ Job created:', jobData);
                const job = JSON.parse(jobData);

                // Test 3: Check job status after a few seconds
                setTimeout(() => {
                    http.get(`http://localhost:3000/jobs/${job.jobId}`, (res) => {
                        let statusData = '';
                        res.on('data', (chunk) => statusData += chunk);
                        res.on('end', () => {
                            console.log('\n📊 Job status:', statusData);

                            // Wait and check results
                            setTimeout(() => {
                                http.get(`http://localhost:3000/jobs/${job.jobId}/results?limit=2`, (res) => {
                                    let resultsData = '';
                                    res.on('data', (chunk) => resultsData += chunk);
                                    res.on('end', () => {
                                        console.log('\n📦 Results (sample):', resultsData);
                                        console.log('\n✅ All tests completed!');
                                        process.exit(0);
                                    });
                                }).on('error', (e) => {
                                    console.error('❌ Error getting results:', e.message);
                                    process.exit(1);
                                });
                            }, 30000); // Wait 30 seconds for some results
                        });
                    }).on('error', (e) => {
                        console.error('❌ Error checking status:', e.message);
                        process.exit(1);
                    });
                }, 5000); // Wait 5 seconds before checking status
            });
        });

        postReq.on('error', (e) => {
            console.error('❌ Error creating job:', e.message);
            process.exit(1);
        });

        postReq.write(postData);
        postReq.end();
    });
});

healthReq.on('error', (e) => {
    console.error('❌ Health check failed:', e.message);
    process.exit(1);
});
