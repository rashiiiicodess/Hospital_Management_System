import { Router } from 'express';
import * as availabilityController from '../controllers/availability.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  setWeeklyTemplateSchema,
  addOverrideSchema,
  getSlotsSchema,
} from '../validation/availability.schemas.js';

const router = Router();

// 1. Doctor sets their own weekly schedule
router.put(
  '/me/availability/weekly',
  authenticate,
  authorize('doctor'),
  validate(setWeeklyTemplateSchema),
  availabilityController.setWeeklySchedule
);

// 2. Doctor adds a date override (leave or custom hours)
router.post(
  '/me/overrides',
  authenticate,
  authorize('doctor'),
  validate(addOverrideSchema),
  availabilityController.addDateOverride
);

// 3. Anyone logged in (Patients, Receptionists, Doctors) can view open slots for a doctor on a date
router.get('/:id/slots', authenticate, validate(getSlotsSchema), availabilityController.getOpenSlots);

// Doctor checks their own configured weekly template
router.get(
  '/me/availability',
  authenticate,
  authorize('doctor'),
  availabilityController.getMyAvailability
);
export default router;