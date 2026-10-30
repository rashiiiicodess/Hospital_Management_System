import { TooManyRequestsError } from '../errors/AppError.js';

/**
 * Clean in-memory sliding window rate limiter.
 * @param {object} options
 * @param {number} options.windowMs - Time frame in milliseconds
 * @param {number} options.max - Max requests per IP in that window
 */
export function rateLimit({ windowMs = 15 * 60 * 1000, max = 100 } = {}) {
  const requests = new Map();

  return (req, res, next) => {
    // In test environment, bypass rate limiting
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const timestamps = requests.get(ip) || [];

    // Filter out expired timestamps
    const activeTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (activeTimestamps.length >= max) {
      return next(new TooManyRequestsError('Too many requests, please try again later.'));
    }

    activeTimestamps.push(now);
    requests.set(ip, activeTimestamps);

    next();
  };
}

// Pre-configured rate limiters:
// Generous general limiter for normal API usage (300 requests per 15 minutes)
export const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });

// Strict limiter for authentication & credential endpoints (20 attempts per 15 minutes)
export const strictAuthLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
