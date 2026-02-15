const express = require('express');
const path = require('path');
const config = require('./config');
const db = require('./db');
const UrlRepository = require('./repositories/urlRepository');
const UrlService = require('./services/urlService');
const LruCache = require('./cache/lruCache');
const createRateLimiter = require('./middleware/rateLimit');

const app = express();
app.use(express.json());
app.set('trust proxy', 1);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = new Set([
    'http://127.0.0.1:5500',
    'http://localhost:5500'
  ]);

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

const urlRepository = new UrlRepository(db);
const cache = new LruCache(config.cacheMaxItems, config.cacheTtlMs);
const urlService = new UrlService({
  urlRepository,
  cache,
  baseUrl: config.baseUrl,
  shortCodeLength: config.shortCodeLength
});

const rateLimiter = createRateLimiter({
  windowMs: config.rateLimitWindowMs,
  maxRequests: config.rateLimitMaxRequests
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.post('/shorten', rateLimiter, async (req, res, next) => {
  try {
    const { originalUrl, ttlDays } = req.body;
    const result = await urlService.shorten({
      originalUrl,
      ttlDays: Number.isInteger(ttlDays) ? ttlDays : undefined
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/:shortCode', rateLimiter, async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const originalUrl = await urlService.resolve(shortCode);
    res.redirect(302, originalUrl);
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({ error: message });
});

module.exports = {
  app,
  cache,
  urlService
};
