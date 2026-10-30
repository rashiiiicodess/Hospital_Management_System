import { Router } from 'express';
import * as recordsController from '../controllers/records.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { vitalsSchema, medicalRecordSchema } from '../validation/records.schemas.js';

const router = Router();

// Receptionists and Admins receive 403 on all clinical record endpoints per PRD
router.use(authenticate, authorize('doctor', 'patient'));

// 1. Doctor records/updates vitals for an appointment
router.put(
  '/appointments/:id/vitals',
  authorize('doctor'),
  validate(vitalsSchema),
  recordsController.saveVitals
);

// 2. Doctor creates/updates draft visit record
router.put(
  '/appointments/:id/record',
  authorize('doctor'),
  validate(medicalRecordSchema),
  recordsController.saveMedicalRecord
);

// 3. Doctor finalizes visit record (moves appointment to completed)
router.post(
  '/appointments/:id/record/finalize',
  authorize('doctor'),
  recordsController.finalizeRecord
);

// 4. View clinical record for an appointment (Doctor in window or Patient self)
router.get('/appointments/:id/record', recordsController.getAppointmentRecord);

// 5. View complete medical history for a patient (Doctor with active window or Patient self)
router.get('/patients/:id/history', recordsController.getPatientHistory);

export default router;