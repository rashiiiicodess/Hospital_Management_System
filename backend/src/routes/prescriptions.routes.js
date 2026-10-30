import { Router } from 'express';
import * as prescriptionsController from '../controllers/prescriptions.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { savePrescriptionSchema } from '../validation/prescriptions.schemas.js';

const router = Router();

router.use(authenticate);

// 1. Doctor creates/replaces prescription for an appointment
router.put(
  '/appointments/:id/prescription',
  authorize('doctor'),
  validate(savePrescriptionSchema),
  prescriptionsController.save
);

// 2. View prescription details (Doctor or Patient)
router.get(
  '/appointments/:id/prescription',
  authorize('doctor', 'patient'),
  prescriptionsController.get
);

// 3. Download prescription PDF (Doctor or Patient)
router.get(
  '/appointments/:id/prescription/pdf',
  authorize('doctor', 'patient'),
  prescriptionsController.downloadPDF
);

export default router;