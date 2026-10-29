export class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_ERROR', fieldErrors = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', fieldErrors = null) {
    super(message, 400, 'VALIDATION_ERROR', fieldErrors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthenticated', code = 'UNAUTHENTICATED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', code = 'CONFLICT') {
    super(message, 409, code);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', code = 'TOO_MANY_REQUESTS') {
    super(message, 429, code);
  }
}

export class AccountLockedError extends AppError {
  constructor(message = 'Account locked due to too many failed attempts', lockedUntil = null) {
    super(message, 423, 'ACCOUNT_LOCKED');
    this.lockedUntil = lockedUntil;
  }
}
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}