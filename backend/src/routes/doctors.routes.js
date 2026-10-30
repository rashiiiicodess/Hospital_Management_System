import { Router } from 'express';
import * as doctorsController from '../controllers/doctors.controller.js';
import * as availabilityController from '../controllers/availability.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  setWeeklyTemplateSchema,
  addOverrideSchema,
  getSlotsSchema,
} from '../validation/availability.schemas.js';
import {
  updateDoctorSelfSchema,
  updateDoctorAdminSchema,
} from '../validation/doctors.schemas.js';

const router = Router();

// 1. Search/List doctors (Public or Logged in users)
router.get('/', doctorsController.list);

// 2. Doctor availability & profile endpoints (Registered BEFORE parameterized /:id)
router.get(
  '/me/availability',
  authenticate,
  authorize('doctor'),
  availabilityController.getMyAvailability
);

router.put(
  '/me/availability/weekly',
  authenticate,
  authorize('doctor'),
  validate(setWeeklyTemplateSchema),
  availabilityController.setWeeklySchedule
);

router.post(
  '/me/overrides',
  authenticate,
  authorize('doctor'),
  validate(addOverrideSchema),
  availabilityController.addDateOverride
);

router.patch(
  '/me',
  authenticate,
  authorize('doctor'),
  validate(updateDoctorSelfSchema),
  doctorsController.updateMe
);

// 3. Open slots for a doctor on a date
router.get('/:id/slots', authenticate, validate(getSlotsSchema), availabilityController.getOpenSlots);

// 4. Public doctor profile by ID
router.get('/:id', doctorsController.getById);

// 5. Admin updates doctor department/specialization
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(updateDoctorAdminSchema),
  doctorsController.updateByAdmin
);

export default router;