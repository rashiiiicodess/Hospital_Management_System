/**
 * Extracts and sanitizes page & limit query parameters.
 * @param {object} query - Express req.query
 * @returns {{ page: number, limit: number, offset: number }}
 */
export function getPagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Builds standard paginated API envelope.
 */
export function buildPaginatedResponse({ data, total, page, limit }) {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}