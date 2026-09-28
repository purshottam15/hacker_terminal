const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config');

function normalizeRollNo(value) {
  return String(value || '').trim().toUpperCase();
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generatePin() {
  return String(crypto.randomInt(100000, 1000000));
}

async function hashPin(pin) {
  return bcrypt.hash(String(pin), 2);
}

async function verifyPin(pin, pinHash) {
  if (!pinHash) return false;
  return bcrypt.compare(String(pin), pinHash);
}

function sessionCookieOptions(maxAge = config.SESSION_DURATION_MS) {
  return {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAMESITE,
    signed: true,
    maxAge
  };
}

function clearSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAMESITE,
    signed: true
  };
}

function safeUserAgent(value) {
  return String(value || '').slice(0, 300);
}

module.exports = {
  normalizeRollNo,
  generateSessionToken,
  hashToken,
  generatePin,
  hashPin,
  verifyPin,
  sessionCookieOptions,
  clearSessionCookieOptions,
  safeUserAgent
};
