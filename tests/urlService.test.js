const UrlService = require('../src/services/urlService');

describe('UrlService', () => {
  test('retries on collision and stores unique code', async () => {
    const urlRepository = {
      findByShortCode: jest
        .fn()
        .mockResolvedValueOnce({ id: 1, short_code: 'abc12345' })
        .mockResolvedValueOnce(null),
      create: jest.fn().mockResolvedValue(2),
      incrementClickCount: jest.fn()
    };

    const cache = {
      get: jest.fn().mockReturnValue(null),
      set: jest.fn()
    };

    const generator = jest
      .fn()
      .mockReturnValueOnce('abc12345')
      .mockReturnValueOnce('def67890');

    const service = new UrlService({
      urlRepository,
      cache,
      baseUrl: 'http://localhost:3000',
      shortCodeLength: 8,
      codeGenerator: generator
    });

    const result = await service.shorten({
      originalUrl: 'https://example.com/path',
      ttlDays: undefined
    });

    expect(result.shortCode).toBe('def67890');
    expect(urlRepository.findByShortCode).toHaveBeenCalledTimes(2);
    expect(urlRepository.create).toHaveBeenCalledTimes(1);
  });

  test('throws 410 for expired links during resolve', async () => {
    const expiredDate = new Date(Date.now() - 60_000);
    const urlRepository = {
      findByShortCode: jest.fn().mockResolvedValue({
        id: 10,
        original_url: 'https://example.com/expired',
        short_code: 'expired1',
        click_count: 4,
        expires_at: expiredDate
      }),
      create: jest.fn(),
      incrementClickCount: jest.fn()
    };

    const cache = {
      get: jest.fn().mockReturnValue(null),
      set: jest.fn()
    };

    const service = new UrlService({
      urlRepository,
      cache,
      baseUrl: 'http://localhost:3000',
      shortCodeLength: 8
    });

    await expect(service.resolve('expired1')).rejects.toMatchObject({ statusCode: 410 });
  });

  test('isExpired handles null and past timestamps', () => {
    const active = { expires_at: null };
    const expired = { expires_at: new Date(Date.now() - 1_000) };

    expect(UrlService.isExpired(active)).toBe(false);
    expect(UrlService.isExpired(expired)).toBe(true);
  });
});
