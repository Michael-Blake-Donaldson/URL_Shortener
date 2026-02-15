const { URL } = require('url');
const { generateShortCode } = require('./codeGenerator');

class UrlService {
  constructor({ urlRepository, cache, baseUrl, shortCodeLength, codeGenerator = generateShortCode }) {
    this.urlRepository = urlRepository;
    this.cache = cache;
    this.baseUrl = baseUrl;
    this.shortCodeLength = shortCodeLength;
    this.codeGenerator = codeGenerator;
    this.maxCollisionRetries = 5;
  }

  static isExpired(urlRecord, now = new Date()) {
    if (!urlRecord.expires_at) {
      return false;
    }

    return new Date(urlRecord.expires_at).getTime() <= now.getTime();
  }

  validateOriginalUrl(rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  async shorten({ originalUrl, ttlDays }) {
    if (!this.validateOriginalUrl(originalUrl)) {
      const error = new Error('Invalid URL. Only HTTP/HTTPS URLs are allowed.');
      error.statusCode = 400;
      throw error;
    }

    const expiresAt = Number.isInteger(ttlDays) && ttlDays > 0
      ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
      : null;

    let attempt = 0;
    while (attempt <= this.maxCollisionRetries) {
      const shortCode = this.codeGenerator(this.shortCodeLength);
      const existing = await this.urlRepository.findByShortCode(shortCode);

      if (existing) {
        attempt += 1;
        continue;
      }

      const id = await this.urlRepository.create({ originalUrl, shortCode, expiresAt });
      const response = {
        shortCode,
        shortUrl: `${this.baseUrl}/${shortCode}`,
        originalUrl,
        expiresAt
      };

      this.cache.set(shortCode, {
        id,
        original_url: originalUrl,
        short_code: shortCode,
        click_count: 0,
        expires_at: expiresAt
      });

      return response;
    }

    const error = new Error('Could not generate unique short code. Please retry.');
    error.statusCode = 503;
    throw error;
  }

  async resolve(shortCode) {
    const cached = this.cache.get(shortCode);
    if (cached) {
      if (UrlService.isExpired(cached)) {
        const error = new Error('Short URL has expired.');
        error.statusCode = 410;
        throw error;
      }

      if (cached.id) {
        await this.urlRepository.incrementClickCount(cached.id);
      }
      return cached.original_url;
    }

    const record = await this.urlRepository.findByShortCode(shortCode);
    if (!record) {
      const error = new Error('Short URL not found.');
      error.statusCode = 404;
      throw error;
    }

    if (UrlService.isExpired(record)) {
      const error = new Error('Short URL has expired.');
      error.statusCode = 410;
      throw error;
    }

    this.cache.set(shortCode, record);
    await this.urlRepository.incrementClickCount(record.id);
    return record.original_url;
  }
}

module.exports = UrlService;
