const crypto = require('crypto');

const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function toBase62(buffer) {
  let value = BigInt(`0x${buffer.toString('hex')}`);
  const base = BigInt(BASE62_ALPHABET.length);
  let result = '';

  if (value === 0n) {
    return BASE62_ALPHABET[0];
  }

  while (value > 0n) {
    const remainder = Number(value % base);
    result = BASE62_ALPHABET[remainder] + result;
    value /= base;
  }

  return result;
}

function generateShortCode(length) {
  const randomBuffer = crypto.randomBytes(12);
  const encoded = toBase62(randomBuffer);

  if (encoded.length >= length) {
    return encoded.slice(0, length);
  }

  const padLength = length - encoded.length;
  const extra = toBase62(crypto.randomBytes(8));
  return (encoded + extra).slice(0, length).padEnd(length, '0');
}

module.exports = {
  generateShortCode
};
