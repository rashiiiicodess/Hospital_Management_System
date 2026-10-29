import { ForbiddenError } from '../errors/AppError.js';

/**
 * Role-based authorization middleware.
 * @param {...string} allowedRoles - List of permitted roles (e.g. 'admin', 'doctor')
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new ForbiddenError('Access forbidden: no authenticated user'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access forbidden: requires ${allowedRoles.join(' or ')} role`));
    }

    next();
  };
}