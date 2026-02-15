const mysql = require('mysql2/promise');
const { performance } = require('perf_hooks');
const config = require('../src/config');

const SAMPLE_ROWS = 100000;
const LOOKUPS = 3000;
const TEST_CODE = 'benchTarget99';

async function setupTable(conn) {
  await conn.query('DROP TABLE IF EXISTS urls_bench');
  await conn.query(`
    CREATE TABLE urls_bench (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      original_url TEXT NOT NULL,
      short_code VARCHAR(32) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      click_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
      PRIMARY KEY (id)
    )
  `);
}

async function seedData(conn) {
  const values = [];
  for (let i = 0; i < SAMPLE_ROWS; i += 1) {
    const code = i === SAMPLE_ROWS - 1 ? TEST_CODE : `code${i}`;
    values.push([`https://example.com/${i}`, code]);
  }

  const chunkSize = 2000;
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    await conn.query('INSERT INTO urls_bench (original_url, short_code) VALUES ?', [chunk]);
  }
}

async function measureLookup(conn, label) {
  const start = performance.now();
  for (let i = 0; i < LOOKUPS; i += 1) {
    await conn.query('SELECT id FROM urls_bench WHERE short_code = ? LIMIT 1', [TEST_CODE]);
  }
  const duration = performance.now() - start;
  console.log(`${label}: ${duration.toFixed(2)} ms for ${LOOKUPS} lookups`);
  return duration;
}

async function run() {
  const conn = await mysql.createConnection({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database
  });

  try {
    console.log('Preparing benchmark dataset...');
    await setupTable(conn);
    await seedData(conn);

    const noIndex = await measureLookup(conn, 'Without index');

    console.log('Adding index on short_code...');
    await conn.query('CREATE INDEX idx_urls_bench_short_code ON urls_bench(short_code)');
    const withIndex = await measureLookup(conn, 'With index');

    const improvement = ((noIndex - withIndex) / noIndex) * 100;
    console.log(`Improvement: ${improvement.toFixed(2)}%`);
  } finally {
    await conn.query('DROP TABLE IF EXISTS urls_bench');
    await conn.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
