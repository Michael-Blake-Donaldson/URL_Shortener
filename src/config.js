const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function parseIntOrDefault(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

module.exports = {
  port: parseIntOrDefault(process.env.PORT, 3000),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  shortCodeLength: parseIntOrDefault(process.env.SHORT_CODE_LENGTH, 8),
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseIntOrDefault(process.env.MYSQL_PORT, 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'url_shortener'
  },
  rateLimitWindowMs: parseIntOrDefault(process.env.RATE_LIMIT_WINDOW_MS, 60000),
  rateLimitMaxRequests: parseIntOrDefault(process.env.RATE_LIMIT_MAX_REQUESTS, 120),
  cacheMaxItems: parseIntOrDefault(process.env.CACHE_MAX_ITEMS, 50000),
  cacheTtlMs: parseIntOrDefault(process.env.CACHE_TTL_MS, 300000)
};
