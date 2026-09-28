const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function boolEnv(name, fallback) {
  if (process.env[name] === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(process.env[name]).toLowerCase());
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

module.exports = {
  NODE_ENV,
  isProduction,
  PORT: process.env.PORT || 4000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hackers-terminal',
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-only-change-me',
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME || 'ht_session',
  COOKIE_SECURE: boolEnv('COOKIE_SECURE', isProduction),
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE || 'lax',
  GAME_DURATION_MS: numberEnv('GAME_DURATION_MINUTES', 45) * ONE_MINUTE_MS,
  SESSION_DURATION_MS: numberEnv('SESSION_DURATION_HOURS', 8) * ONE_HOUR_MS,
  ACTIVE_SESSION_STALE_MS: numberEnv('ACTIVE_SESSION_STALE_SECONDS', 300) * 1000,
  COMMAND_RESULT_TTL_MS: numberEnv('COMMAND_RESULT_TTL_MINUTES', 120) * ONE_MINUTE_MS,
  JSON_BODY_LIMIT: process.env.JSON_BODY_LIMIT || '16kb'
};
