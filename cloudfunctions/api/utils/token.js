const crypto = require('crypto');

const DEFAULT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

function signToken(payload, expiresInSeconds = DEFAULT_EXPIRES_IN_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode({
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  });
  const signature = sign(`${header}.${body}`);

  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  const parts = String(token || '').split('.');

  if (parts.length !== 3) {
    throw new Error('token 格式错误');
  }

  const [header, body, signature] = parts;
  const expected = sign(`${header}.${body}`);

  if (expected !== signature) {
    throw new Error('token 校验失败');
  }

  const payload = decode(body);
  const now = Math.floor(Date.now() / 1000);

  if (!payload.exp || payload.exp < now) {
    throw new Error('token 已过期');
  }

  return payload;
}

function sign(value) {
  return crypto
    .createHmac('sha256', getSecret())
    .update(value)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function encode(value) {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return JSON.parse(Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8'));
}

function getSecret() {
  return process.env.JWT_SECRET || 'zakkart-dev-jwt-secret';
}

module.exports = {
  signToken,
  verifyToken
};
