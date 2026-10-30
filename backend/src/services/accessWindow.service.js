import { pool } from '../db/pool.js';
import { nowInHospital, toHospitalDateTime } from '../lib/time.js';
import { APPOINTMENT_CONFIG } from '../config/constants.js';
import { AppError } from '../errors/AppError.js';

export class AccessWindowClosedError extends AppError {
  constructor(message, opensAt, closesAt) {
    super(message, 403, 'ACCESS_WINDOW_CLOSED');
    this.opensAt = opensAt;
    this.closesAt = closesAt;
  }
}

/**
 * Checks whether a doctor currently has access to a patient's clinical records for an appointment.
 * 
 * Rules:
 * - Window opens: 20 minutes before appointment start_time.
 * - Window closes: exactly when appointment end_time arrives.
 * - Allowed for statuses: 'booked', 'checked_in', 'completed' (or while draft is open).
 *
 * @param {number} doctorId
 * @param {object} appointment
 * @throws {AccessWindowClosedError} if outside the access window
 */
export function assertDoctorAccessWindow(doctorId, appointment) {
  if (appointment.doctor_id !== doctorId) {
    throw new AppError('Forbidden: Not your assigned appointment', 403, 'FORBIDDEN');
  }

  const now = nowInHospital();
  const startTime = toHospitalDateTime(appointment.start_time);
  const endTime = toHospitalDateTime(appointment.end_time);

  // Opens 20 minutes before start
  const windowOpensAt = startTime.minus({
    minutes: APPOINTMENT_CONFIG.CLINICAL_ACCESS_WINDOW_BEFORE_MINUTES, // 20
  });

  // Closes at slot end
  const windowClosesAt = endTime;

  if (now < windowOpensAt || now > windowClosesAt) {
    throw new AccessWindowClosedError(
      'Clinical access window is closed for this appointment',
      windowOpensAt.toISO(),
      windowClosesAt.toISO()
    );
  }
}

/**
 * Checks if doctor has ANY active clinical window for a given patient right now.
 * Used when viewing a patient's overall historical medical record.
 * 
 * @param {number} doctorId
 * @param {number} patientId
 */
export async function assertActiveWindowForPatient(doctorId, patientId) {
  const query = `
    SELECT id, doctor_id, patient_id, start_time, end_time, status
    FROM appointments
    WHERE doctor_id = $1 
      AND patient_id = $2
      AND status IN ('booked', 'checked_in')
      AND NOW() >= (start_time - INTERVAL '20 minutes')
      AND NOW() <= end_time
    LIMIT 1;
  `;
  const result = await pool.query(query, [doctorId, patientId]);

  if (result.rows.length === 0) {
    throw new AppError(
      'Doctor has no active appointment access window with this patient at this time',
      403,
      'ACCESS_WINDOW_CLOSED'
    );
  }

  return result.rows[0];
}