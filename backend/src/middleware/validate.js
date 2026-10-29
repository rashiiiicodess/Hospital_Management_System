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
        // Path might look like ['body', 'email'] -> key as 'email'
        const pathKey = issue.path.slice(1).join('.') || issue.path.join('.');
        fieldErrors[pathKey] = issue.message;
      }
      return next(new ValidationError('Validation failed', fieldErrors));
    }

    // Replace request data with parsed/sanitized versions
    if (result.data.body !== undefined) req.body = result.data.body;
    if (result.data.query !== undefined) req.query = result.data.query;
    if (result.data.params !== undefined) req.params = result.data.params;

    next();
  };
}