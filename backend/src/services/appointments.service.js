import { pool, withTransaction } from '../db/pool.js';
import * as appointmentsQueries from '../db/queries/appointments.queries.js';
import { assertValidTransition } from './appointmentStateMachine.js';
import { handleDbError } from '../lib/dbErrors.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../errors/AppError.js';
import { APPOINTMENT_STATUS } from '../config/constants.js';
import { getDoctorSlots } from './availability.service.js';
import { toHospitalDateTime } from '../lib/time.js';

export async function bookAppointment(currentUser, { doctorId, patientId, startTime, endTime }) {
  return withTransaction(async (client) => {
    try {
      // 1. Resolve patients.id (appointments.patient_id always stores patients.id, not account_id)
      let targetPatientId = patientId; // staff passes patients.id directly from search result

      if (currentUser.role === 'patient') {
        // Registered patients login with account_id; resolve to patients.id
        const res = await client.query(
          'SELECT id FROM patients WHERE account_id = $1',
          [currentUser.id]
        );
        if (!res.rows[0]) throw new NotFoundError('Patient profile not found for this account');
        targetPatientId = res.rows[0].id;
      } else if (!targetPatientId) {
        throw new ConflictError('Patient ID is required when booking as staff');
      }

      // 2. Check slot duration is exactly 20 minutes
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMinutes = (end - start) / (1000 * 60);

      if (diffMinutes !== 20) {
        throw new ConflictError('Appointment slot duration must be exactly 20 minutes');
      }

      // 3. Revalidate: Is this slot actually offered by the doctor on this date?
      const targetDateStr = toHospitalDateTime(startTime).toFormat('yyyy-MM-dd');
      const openSlots = await getDoctorSlots(doctorId, targetDateStr);

      const isSlotOffered = openSlots.some((slot) => {
        return (
          new Date(slot.startTime).getTime() === start.getTime() &&
          new Date(slot.endTime).getTime() === end.getTime()
        );
      });

      if (!isSlotOffered) {
        throw new ConflictError(
          'The requested slot is not offered or the doctor is unavailable on this date',
          'SLOT_NOT_AVAILABLE'
        );
      }

      // 4. Insert appointment (Postgres exclusion constraint protects against concurrent race conditions)
      const appointment = await appointmentsQueries.createAppointment(client, {
        doctorId,
        patientId: targetPatientId,
        startTime,
        endTime,
      });

      return appointment;
    } catch (err) {
      handleDbError(err);
    }
  });
}

export async function getAppointments(currentUser, filters) {
  return appointmentsQueries.listAppointments(pool, {
    role: currentUser.role,
    userId: currentUser.id,
    ...filters,
  });
}

export async function cancelAppointment(currentUser, appointmentId, reason) {
  return withTransaction(async (client) => {
    const appointment = await appointmentsQueries.findAppointmentById(client, appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    // For patients: scope check using patient_account_id (now returned from findAppointmentById)
    if (currentUser.role === 'patient' && appointment.patient_account_id !== currentUser.id) {
      throw new NotFoundError('Appointment not found');
    }
    if (currentUser.role === 'doctor' && appointment.doctor_id !== currentUser.id) {
      throw new NotFoundError('Appointment not found');
    }

    if (appointment.status === APPOINTMENT_STATUS.CHECKED_IN) {
      throw new ConflictError('Checked-in appointments cannot be cancelled');
    }

    if (['doctor', 'receptionist'].includes(currentUser.role) && !reason) {
      throw new ConflictError('A cancellation reason is required');
    }

    let nextStatus = APPOINTMENT_STATUS.CANCELLED;
    if (currentUser.role === 'doctor') {
      nextStatus = APPOINTMENT_STATUS.NEEDS_RESCHEDULE;
    }

    assertValidTransition(appointment.status, nextStatus);

    return appointmentsQueries.updateAppointmentStatus(client, {
      id: appointmentId,
      status: nextStatus,
      cancellationReason: reason,
      cancelledBy: currentUser.id,
    });
  });
}

export async function checkInAppointment(currentUser, appointmentId) {
  return withTransaction(async (client) => {
    const appointment = await appointmentsQueries.findAppointmentById(client, appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    assertValidTransition(appointment.status, APPOINTMENT_STATUS.CHECKED_IN);

    return appointmentsQueries.updateAppointmentStatus(client, {
      id: appointmentId,
      status: APPOINTMENT_STATUS.CHECKED_IN,
    });
  });
}

export async function getRescheduleQueue() {
  return appointmentsQueries.listRescheduleQueue(pool);
}

export async function rescheduleAppointment(currentUser, appointmentId, { startTime, endTime }) {
  return withTransaction(async (client) => {
    const appointment = await appointmentsQueries.findAppointmentById(client, appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    // Only booked or needs_reschedule can be rescheduled
    if (!['booked', 'needs_reschedule'].includes(appointment.status)) {
      throw new ConflictError(`Cannot reschedule appointment in status '${appointment.status}'`);
    }

    // Revalidate new slot against doctor's offered slots
    const targetDateStr = toHospitalDateTime(startTime).toFormat('yyyy-MM-dd');
    const openSlots = await getDoctorSlots(appointment.doctor_id, targetDateStr);

    const isSlotOffered = openSlots.some((slot) => {
      return (
        new Date(slot.startTime).getTime() === new Date(startTime).getTime() &&
        new Date(slot.endTime).getTime() === new Date(endTime).getTime()
      );
    });

    if (!isSlotOffered) {
      throw new ConflictError('The selected new slot is not available', 'SLOT_NOT_AVAILABLE');
    }

    // Atomically move appointment to new slot and set status back to 'booked'
    return appointmentsQueries.rescheduleAppointmentSlot(client, {
      id: appointmentId,
      startTime,
      endTime,
    });
  });
}