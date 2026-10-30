import { Router } from 'express';
import * as patientsController from '../controllers/patients.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { registerWalkInSchema } from '../validation/patients.schemas.js';

const router = Router();

router.use(authenticate);

// Receptionists can register walk-in patients
router.post(
  '/',
  authorize('receptionist', 'admin'),
  validate(registerWalkInSchema),
  patientsController.registerWalkIn
);

// Search patients by name, phone, or email
router.get(
  '/search',
  authorize('receptionist', 'doctor', 'admin'),
  patientsController.searchPatients
);

export default router;