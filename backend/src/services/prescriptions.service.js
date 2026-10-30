import { pool, withTransaction } from '../db/pool.js';
import * as prescriptionsQueries from '../db/queries/prescriptions.queries.js';
import * as appointmentsQueries from '../db/queries/appointments.queries.js';
import { assertDoctorAccessWindow } from './accessWindow.service.js';
import { logAccess } from './audit.service.js';
import { generatePrescriptionPDF } from '../lib/pdf.js';
import { NotFoundError, ForbiddenError } from '../errors/AppError.js';

export async function savePrescription(doctorUser, appointmentId, { notes, items }) {
  return withTransaction(async (client) => {
    const appointment = await appointmentsQueries.findAppointmentById(client, appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    assertDoctorAccessWindow(doctorUser.id, appointment);

    const prescription = await prescriptionsQueries.createPrescription(client, {
      appointmentId,
      doctorId: doctorUser.id,
      patientId: appointment.patient_id,
      notes,
    });

    const savedItems = await prescriptionsQueries.addPrescriptionItems(client, prescription.id, items);

    await logAccess(client, {
      userId: doctorUser.id,
      action: 'ISSUE_PRESCRIPTION',
      resourceType: 'PRESCRIPTION',
      resourceId: prescription.id,
      patientId: appointment.patient_id,
    });

    return { ...prescription, items: savedItems };
  });
}

export async function getPrescription(currentUser, appointmentId) {
  const appointment = await appointmentsQueries.findAppointmentById(pool, appointmentId);
  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  // Access: Patient can read their own; Doctor can read their own
 if (currentUser.role === 'patient' && appointment.patient_account_id !== currentUser.id) {
    throw new NotFoundError('Prescription not found');
  }
  if (currentUser.role === 'doctor' && appointment.doctor_id !== currentUser.id) {
    throw new NotFoundError('Prescription not found');
  }

  const prescription = await prescriptionsQueries.findPrescriptionByAppointmentId(pool, appointmentId);
  if (!prescription) {
    throw new NotFoundError('No prescription issued for this appointment');
  }

  return prescription;
}

export async function downloadPrescriptionPDF(currentUser, appointmentId) {
  const prescription = await getPrescription(currentUser, appointmentId);

  return generatePrescriptionPDF({
    doctor: {
      first_name: prescription.doctor_first_name,
      last_name: prescription.doctor_last_name,
      specialization: prescription.specialization,
    },
    patient: {
      first_name: prescription.patient_first_name,
      last_name: prescription.patient_last_name,
      phone: prescription.patient_phone,
    },
    appointment: {
      id: prescription.appointment_id,
      start_time: prescription.start_time,
    },
    items: prescription.items,
    notes: prescription.notes,
  });
}