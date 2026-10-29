import { pool } from '../db/pool.js';
import * as departmentsQueries from '../db/queries/departments.queries.js';
import { handleDbError } from '../lib/dbErrors.js';

export async function getAllDepartments() {
  return departmentsQueries.listDepartments(pool);
}

export async function addDepartment(name) {
  try {
    return await departmentsQueries.createDepartment(pool, name);
  } catch (err) {
    handleDbError(err);
  }
}