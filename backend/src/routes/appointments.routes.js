import { Router } from 'express';
import * as appointmentsController from '../controllers/appointments.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  bookAppointmentSchema,
  cancelAppointmentSchema,
} from '../validation/appointments.schemas.js';

import { rescheduleSchema } from '../validation/patients.schemas.js';
const router = Router();

// All appointment routes require authentication
router.use(authenticate);

// 1. Book an appointment (Patient or Receptionist)
router.post(
  '/',
  authorize('patient', 'receptionist'),
  validate(bookAppointmentSchema),
  appointmentsController.book
);

// 2. List appointments (Role-scoped)
router.get('/', appointmentsController.list);

// 3. Cancel an appointment
router.post(
  '/:id/cancel',
  validate(cancelAppointmentSchema),
  appointmentsController.cancel
);

// 4. Check-in an appointment (Receptionist only)
router.post(
  '/:id/check-in',
  authorize('receptionist'),
  appointmentsController.checkIn
);

// Reschedule queue (Receptionist & Admin)
router.get(
  '/reschedule-queue',
  authorize('receptionist', 'admin'),
  appointmentsController.getRescheduleQueue
);

// Reschedule an appointment to a new slot (Receptionist only)
router.post(
  '/:id/reschedule',
  authorize('receptionist'),
  validate(rescheduleSchema),
  appointmentsController.reschedule
);

// Mark as no-show (Doctor or Receptionist)
router.post(
  '/:id/no-show',
  authorize('doctor', 'receptionist'),
  appointmentsController.markNoShow
);

// Revert no-show back to booked
router.post(
  '/:id/revert-no-show',
  authorize('doctor', 'receptionist'),
  appointmentsController.revertNoShow
);

export default router;


