import { pool } from '../db/pool.js';
import * as auditQueries from '../db/queries/audit.queries.js';

/**
 * Records an audit event for sensitive clinical actions.
 */
export async function logAccess(clientOrPool, { userId, action, resourceType, resourceId, patientId }) {
  const client = clientOrPool || pool;
  try {
    return await auditQueries.logAuditEvent(client, {
      userId,
      action,
      resourceType,
      resourceId,
      patientId,
    });
  } catch (err) {
    // Non-blocking logger failure to prevent breaking user flow
    console.error('⚠️ Failed to write audit log:', err.message);
  }
}