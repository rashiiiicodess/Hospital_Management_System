import { ConflictError, ValidationError } from '../errors/AppError.js';

/**
 * Maps known PostgreSQL errors to standardized AppError instances.
 *
 * Postgres error codes:
 * - 23505: unique_violation
 * - 23503: foreign_key_violation
 * - 23P01: exclusion_violation (used for appointment concurrency)
 *
 * @param {Error} error
 * @throws {AppError}
 */
export function handleDbError(error) {
  if (!error || !error.code) {
    throw error;
  }

  // Exclusion violation (e.g., overlapping appointment slots or patient double-booking)
  if (error.code === '23P01') {
    if (error.constraint && error.constraint.includes('patient')) {
      throw new ConflictError('Patient already has an appointment during this time', 'PATIENT_OVERLAP');
    }
    throw new ConflictError('The selected appointment slot has already been booked', 'SLOT_TAKEN');
  }

  // Unique constraint violation
  if (error.code === '23505') {
    if (error.constraint && error.constraint.includes('email')) {
      throw new ConflictError('An account with this email already exists', 'EMAIL_IN_USE');
    }
    if (error.constraint && error.constraint.includes('phone')) {
      throw new ConflictError('A record with this phone number already exists', 'DUPLICATE_PATIENT');
    }
    throw new ConflictError('A record with these details already exists', 'DUPLICATE_RECORD');
  }

  // Foreign key violation
  if (error.code === '23503') {
    throw new ValidationError('Referenced record does not exist or cannot be modified');
  }

  // If no specific mapping matches, re-throw the original error
  throw error;
}