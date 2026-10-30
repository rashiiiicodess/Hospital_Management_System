import { pool } from '../db/pool.js';
import * as statsQueries from '../db/queries/stats.queries.js';

export async function getSummaryStats() {
  return statsQueries.getDashboardSummary(pool);
}

export async function getStatusBreakdown() {
  return statsQueries.getAppointmentsByStatus(pool);
}

export async function getDepartmentBreakdown() {
  return statsQueries.getAppointmentsByDepartment(pool);
} 