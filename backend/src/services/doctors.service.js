import { pool } from '../db/pool.js';
import * as doctorsQueries from '../db/queries/doctors.queries.js';
import { NotFoundError } from '../errors/AppError.js';

export async function listDoctors(filters) {
  return doctorsQueries.listDoctors(pool, filters);
}

export async function getDoctorById(doctorId) {
  const doctor = await doctorsQueries.findDoctorById(pool, doctorId);
  if (!doctor) {
    throw new NotFoundError('Doctor not found');
  }
  return doctor;
}

export async function updateSelfProfile(doctorId, data) {
  const updated = await doctorsQueries.updateDoctorSelfProfile(pool, doctorId, data);
  if (!updated) {
    throw new NotFoundError('Doctor profile not found');
  }
  return updated;
}

export async function updateDoctorByAdmin(doctorId, data) {
  const updated = await doctorsQueries.updateDoctorAdmin(pool, doctorId, data);
  if (!updated) {
    throw new NotFoundError('Doctor not found');
  }
  return updated;
}