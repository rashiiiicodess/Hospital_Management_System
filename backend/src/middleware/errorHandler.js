import { AppError } from '../errors/AppError.js';
import { env } from '../config/env.js';

/**
 * Global Express error handling middleware.
 */
export function errorHandler(err, req, res, next) {
  // Operational errors created deliberately (AppError instances)
  if (err instanceof AppError) {
    const response = {
      code: err.code,
      message: err.message,
    };

    if (err.fieldErrors) {
      response.fieldErrors = err.fieldErrors;
    }

    if (err.lockedUntil) {
      response.lockedUntil = err.lockedUntil;
    }

    return res.status(err.statusCode).json(response);
  }

  // Unexpected system or programmer bugs
  console.error('💥 Unhandled Exception:', err);

  const statusCode = 500;
  const response = {
    code: 'INTERNAL_ERROR',
    message: env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  };

  res.status(statusCode).json(response);
}