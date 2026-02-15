const { generateShortCode } = require('../src/services/codeGenerator');

describe('generateShortCode', () => {
  test('returns code with requested length', () => {
    const code = generateShortCode(8);
    expect(code).toHaveLength(8);
  });

  test('returns only base62 characters', () => {
    const code = generateShortCode(12);
    expect(code).toMatch(/^[0-9a-zA-Z]+$/);
  });
});
