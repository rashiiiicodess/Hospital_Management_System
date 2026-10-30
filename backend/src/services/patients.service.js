import { pool, withTransaction } from '../db/pool.js';
import * as patientsQueries from '../db/queries/patients.queries.js';
import { ConflictError } from '../errors/AppError.js';

export async function registerWalkIn({ firstName, lastName, phone, email, dateOfBirth, force }) {
  return withTransaction(async (client) => {
    // Check for potential duplicate patient by phone or email
    if (!force) {
      const duplicates = await patientsQueries.findPotentialDuplicates(client, { phone, email });
      if (duplicates.length > 0) {
        throw new ConflictError(
          'Possible duplicate patient found with this phone or email',
          'DUPLICATE_PATIENT'
        );
      }
    }

    return patientsQueries.createWalkInPatient(client, {
      firstName,
      lastName,
      phone,
      email,
      dateOfBirth,
    });
  });
}

export async function searchPatients(query) {
  if (!query || query.trim().length === 0) return [];
  return patientsQueries.searchPatients(pool, query);
}