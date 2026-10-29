import bcrypt from 'bcrypt';
import { AUTH_CONFIG } from '../config/constants.js';

/**
 * Hashes a plaintext password using bcrypt.
 * @param {string} plainPassword
 * @returns {Promise<string>}
 */
export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, AUTH_CONFIG.SALT_ROUNDS);
}

/**
 * Compares a plaintext password with a stored hash.
 * @param {string} plainPassword
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function comparePassword(plainPassword, hash) {
  if (!hash) return false;
  return bcrypt.compare(plainPassword, hash);
}