import { pool, withTransaction } from '../db/pool.js';
import * as recordsQueries from '../db/queries/records.queries.js';
import * as appointmentsQueries from '../db/queries/appointments.queries.js';
import { assertDoctorAccessWindow } from './accessWindow.service.js';
import { logAccess } from './audit.service.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../errors/AppError.js';
import { APPOINTMENT_STATUS } from '../config/constants.js';

export async function saveVitals(doctorUser, appointmentId, vitalsData) {
  return withTransaction(async (client) => {
    const appointment = await appointmentsQueries.findAppointmentById(client, appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    // Verify 20-min doctor access window for recording vitals
    assertDoctorAccessWindow(doctorUser.id, appointment);

    const saved = await recordsQueries.upsertVitals(client, {
      appointmentId,
      ...vitalsData,
    });

    await logAccess(client, {
      userId: doctorUser.id,
      action: 'UPDATE_VITALS',
      resourceType: 'VITALS',
      resourceId: appointmentId,
      patientId: appointment.patient_id,
    });

    return saved;
  });
}

export async function saveMedicalRecord(doctorUser, appointmentId, recordData) {
  return withTransaction(async (client) => {
    const appointment = await appointmentsQueries.findAppointmentById(client, appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    assertDoctorAccessWindow(doctorUser.id, appointment);

    const saved = await recordsQueries.upsertMedicalRecord(client, {
      appointmentId,
      patientId: appointment.patient_id,
      doctorId: doctorUser.id,
      ...recordData,
    });

    if (!saved) {
      throw new ConflictError('Cannot update a finalized medical record');
    }

    await logAccess(client, {
      userId: doctorUser.id,
      action: 'SAVE_MEDICAL_RECORD',
      resourceType: 'MEDICAL_RECORD',
      resourceId: saved.id,
      patientId: appointment.patient_id,
    });

    return saved;
  });
}

export async function finalizeRecordAndCompleteVisit(doctorUser, appointmentId) {
  return withTransaction(async (client) => {
    const appointment = await appointmentsQueries.findAppointmentById(client, appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    if (appointment.doctor_id !== doctorUser.id) {
      throw new ForbiddenError('Forbidden: Not your assigned appointment');
    }

    // Must have a draft record to finalize
    const finalized = await recordsQueries.finalizeMedicalRecord(client, appointmentId);
    if (!finalized) {
      throw new ConflictError('No unfinalized draft record found for this appointment');
    }

    // Move appointment to 'completed'
    await appointmentsQueries.updateAppointmentStatus(client, {
      id: appointmentId,
      status: APPOINTMENT_STATUS.COMPLETED,
    });

    await logAccess(client, {
      userId: doctorUser.id,
      action: 'FINALIZE_MEDICAL_RECORD',
      resourceType: 'MEDICAL_RECORD',
      resourceId: finalized.id,
      patientId: appointment.patient_id,
    });

    return finalized;
  });
}

export async function getPatientHistory(currentUser, patientId) {
  const numericPatientId = Number(patientId);

  // Doctors can view anytime! Registered patients can only view their own profile.
  if (currentUser.role === 'patient') {
    const patientRes = await pool.query(
      'SELECT id FROM patients WHERE account_id = $1',
      [currentUser.id]
    );
    const patientRecord = patientRes.rows[0];
    if (!patientRecord || patientRecord.id !== numericPatientId) {
      throw new ForbiddenError('Patients can only view their own history');
    }
  }

  const history = await recordsQueries.getPatientMedicalHistory(pool, numericPatientId);

  await logAccess(pool, {
    userId: currentUser.id,
    action: 'VIEW_PATIENT_HISTORY',
    resourceType: 'PATIENT_HISTORY',
    resourceId: numericPatientId,
    patientId: numericPatientId,
  });

  return history;
}

export async function getAppointmentRecord(currentUser, appointmentId) {
  const appointment = await appointmentsQueries.findAppointmentById(pool, appointmentId);
  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  // Access checks
  if (currentUser.role === 'patient' && appointment.patient_account_id !== currentUser.id) {
    throw new NotFoundError('Appointment not found');
  }
  // Doctors can view past appointment clinical records anytime

  const record = await recordsQueries.findMedicalRecordByAppointmentId(pool, appointmentId);
  const vitals = await recordsQueries.findVitalsByAppointmentId(pool, appointmentId);

  await logAccess(pool, {
    userId: currentUser.id,
    action: 'VIEW_APPOINTMENT_RECORD',
    resourceType: 'APPOINTMENT_RECORD',
    resourceId: appointmentId,
    patientId: appointment.patient_id,
  });

  return { appointment, record, vitals };
}