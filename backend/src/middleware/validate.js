import { ValidationError } from '../errors/AppError.js';

/**
 * Creates an Express middleware to validate request parameters using a Zod schema.
 * @param {import('zod').ZodSchema} schema - Schema covering body, query, and/or params
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const fieldErrors = {};
      for (const issue of result.error.issues) {
        const pathKey = issue.path.slice(1).join('.') || issue.path.join('.');
        fieldErrors[pathKey] = issue.message;
      }
      return next(new ValidationError('Validation failed', fieldErrors));
    }

    // Safely update parsed data in Express 5
    if (result.data.body !== undefined) {
      req.body = result.data.body;
    }
    if (result.data.query !== undefined) {
      Object.defineProperty(req, 'query', {
        value: result.data.query,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    if (result.data.params !== undefined) {
      Object.defineProperty(req, 'params', {
        value: result.data.params,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }

    next();
  };
}