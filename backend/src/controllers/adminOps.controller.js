import { pool } from '../db/pool.js';
import * as auditQueries from '../db/queries/audit.queries.js';

export async function getAuditLogs(req, res, next) {
  try {
    const logs = await auditQueries.listAuditLogs(pool, req.query);
    res.status(200).json({ data: logs });
  } catch (err) {
    next(err);
  }
}