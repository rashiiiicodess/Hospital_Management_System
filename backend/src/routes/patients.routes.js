import { Router } from 'express';
import * as patientsController from '../controllers/patients.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  registerWalkInSchema,
  updatePatientDemographicsSchema,
  updatePatientMedicalProfileSchema,
} from '../validation/patients.schemas.js';

const router = Router();

router.use(authenticate);

// 1. Walk-in registration (Receptionist & Admin)
router.post(
  '/',
  authorize('receptionist', 'admin'),
  validate(registerWalkInSchema),
  patientsController.registerWalkIn
);

// 2. Search patients (must be before /:id)
router.get(
  '/search',
  authorize('receptionist', 'doctor', 'admin'),
  patientsController.searchPatients
);

// 3. Logged-in patient views own profile (must be before /:id)
router.get('/me', authorize('patient'), patientsController.getMe);

// 4. View patient details
router.get('/:id', authorize('doctor', 'receptionist', 'admin', 'patient'), patientsController.getById);

// 5. Update patient demographics (Patient own or Receptionist)
router.patch(
  '/:id',
  authorize('patient', 'receptionist'),
  validate(updatePatientDemographicsSchema),
  patientsController.updateDemographics
);

// 6. Doctor updates patient medical profile (blood group, allergies, chronic conditions)
router.patch(
  '/:id/medical-profile',
  authorize('doctor'),
  validate(updatePatientMedicalProfileSchema),
  patientsController.updateMedicalProfile
);

export default router;