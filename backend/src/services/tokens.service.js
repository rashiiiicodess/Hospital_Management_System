import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { AUTH_CONFIG } from '../config/constants.js';

/**
 * Generates an access token for an authenticated user.
 * @param {object} payload - { accountId, role }
 * @returns {string} JWT
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Verifies an access token.
 * @param {string} token
 * @returns {object} Decoded payload
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/**
 * Generates a cryptographically secure random token string for refresh tokens or invites.
 * @returns {string}
 */
export function generateRandomToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes a SHA-256 hash of a token before saving it to the database.
 * @param {string} token
 * @returns {string}
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}