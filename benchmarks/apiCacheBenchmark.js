const autocannon = require('autocannon');

function runAutocannon(url, title) {
  return new Promise((resolve, reject) => {
    autocannon(
      {
        url,
        connections: 50,
        duration: 15,
        method: 'GET'
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        console.log(`${title} - Avg latency: ${result.latency.average.toFixed(2)} ms`);
        console.log(`${title} - Req/sec: ${result.requests.average.toFixed(2)}`);
        resolve(result);
      }
    );
  });
}

async function run() {
  const endpoint = process.argv[2] || 'http://localhost:3000/testcode';

  console.log('Phase 1: cold cache run');
  await runAutocannon(endpoint, 'Cold cache');

  console.log('Phase 2: warm cache run');
  await runAutocannon(endpoint, 'Warm cache');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
