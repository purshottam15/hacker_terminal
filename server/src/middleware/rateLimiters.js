const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait and try again.' }
});

const gameCommandLimiter = rateLimit({
  windowMs: 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.player?._id?.toString() || req.ip,
  message: { error: 'Too many commands. Slow down for a moment.' }
});

const adminActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.player?._id?.toString() || req.ip,
  message: { error: 'Too many admin requests. Please wait and try again.' }
});

module.exports = {
  loginLimiter,
  gameCommandLimiter,
  adminActionLimiter
};
