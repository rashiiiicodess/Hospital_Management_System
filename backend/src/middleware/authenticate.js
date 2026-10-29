import { verifyAccessToken } from '../services/tokens.service.js';
import { UnauthorizedError } from '../errors/AppError.js';
import { pool } from '../db/pool.js';

/**
 * Validates the Authorization: Bearer <token> header and attaches the user to req.user.
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    let payload;

    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token has expired', 'TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid token', 'UNAUTHENTICATED');
    }

    // Verify account is still active in database
    const result = await pool.query(
      'SELECT id, email, role, status FROM accounts WHERE id = $1',
      [payload.accountId]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('User account not found');
    }

    const account = result.rows[0];
    if (account.status !== 'active') {
      throw new UnauthorizedError('Account is not active or has been deactivated', 'FORBIDDEN');
    }

    // Attach user identity to request object
    req.user = {
      id: account.id,
      email: account.email,
      role: account.role,
    };

    next();
  } catch (err) {
    next(err);
  }
}