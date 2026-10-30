import { pool, withTransaction } from '../db/pool.js';
import * as patientsQueries from '../db/queries/patients.queries.js';
import { ConflictError, NotFoundError, ForbiddenError } from '../errors/AppError.js';

export async function registerWalkIn({ firstName, lastName, phone, email, dateOfBirth, force }) {
  return withTransaction(async (client) => {
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

export async function getPatientById(currentUser, patientId) {
  const patient = await patientsQueries.findPatientById(pool, patientId);
  if (!patient) {
    throw new NotFoundError('Patient not found');
  }

  // Patients can only view themselves
  if (currentUser.role === 'patient' && patient.account_id !== currentUser.id) {
    throw new NotFoundError('Patient not found');
  }

  // Receptionists & Admins see demographics only (strip clinical fields per PRD)
  if (['receptionist', 'admin'].includes(currentUser.role)) {
    const { blood_group, allergies, chronic_conditions, ...demographics } = patient;
    return demographics;
  }

  return patient;
}

export async function getMyPatientProfile(currentUser) {
  const patient = await patientsQueries.findPatientByAccountId(pool, currentUser.id);
  if (!patient) {
    throw new NotFoundError('Patient profile not found for this account');
  }
  return patient;
}

export async function updateDemographics(currentUser, patientId, data) {
  const patient = await patientsQueries.findPatientById(pool, patientId);
  if (!patient) {
    throw new NotFoundError('Patient not found');
  }

  if (currentUser.role === 'patient' && patient.account_id !== currentUser.id) {
    throw new ForbiddenError('You can only update your own profile');
  }

  return patientsQueries.updatePatientDemographics(pool, patientId, data);
}

export async function updateMedicalProfile(currentUser, patientId, data) {
  const patient = await patientsQueries.findPatientById(pool, patientId);
  if (!patient) {
    throw new NotFoundError('Patient not found');
  }

  return patientsQueries.updatePatientMedicalProfile(pool, patientId, data);
}