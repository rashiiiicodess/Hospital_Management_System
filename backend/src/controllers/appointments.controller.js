import * as appointmentsService from '../services/appointments.service.js';

export async function book(req, res, next) {
  try {
    const result = await appointmentsService.bookAppointment(req.user, req.body);
    res.status(201).json({ message: 'Appointment booked successfully', appointment: result });
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const appointments = await appointmentsService.getAppointments(req.user, req.query);
    res.status(200).json({ data: appointments });
  } catch (err) {
    next(err);
  }
}

export async function cancel(req, res, next) {
  try {
    const cancelled = await appointmentsService.cancelAppointment(
      req.user,
      req.params.id,
      req.body.reason
    );
    res.status(200).json({ message: 'Appointment cancelled', appointment: cancelled });
  } catch (err) {
    next(err);
  }
}

export async function checkIn(req, res, next) {
  try {
    const checkedIn = await appointmentsService.checkInAppointment(req.user, req.params.id);
    res.status(200).json({ message: 'Patient checked in', appointment: checkedIn });
  } catch (err) {
    next(err);
  }
}
export async function getRescheduleQueue(req, res, next) {
  try {
    const queue = await appointmentsService.getRescheduleQueue();
    res.status(200).json({ data: queue });
  } catch (err) {
    next(err);
  }
}

export async function reschedule(req, res, next) {
  try {
    const result = await appointmentsService.rescheduleAppointment(
      req.user,
      req.params.id,
      req.body
    );
    res.status(200).json({ message: 'Appointment rescheduled successfully', appointment: result });
  } catch (err) {
    next(err);
  }
}

export async function markNoShow(req, res, next) {
  try {
    const updated = await appointmentsService.markNoShow(req.user, req.params.id);
    res.status(200).json({ message: 'Appointment marked as no-show', appointment: updated });
  } catch (err) {
    next(err);
  }
}

export async function revertNoShow(req, res, next) {
  try {
    const updated = await appointmentsService.revertNoShow(req.user, req.params.id);
    res.status(200).json({ message: 'No-show reverted back to booked', appointment: updated });
  } catch (err) {
    next(err);
  }
}