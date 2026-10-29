import { Router } from 'express';
import * as adminUsersController from '../controllers/adminUsers.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createDoctorAccountSchema, createStaffAccountSchema } from '../validation/accounts.schemas.js';

const router = Router();

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

router.post('/users/doctors', validate(createDoctorAccountSchema), adminUsersController.createDoctor);
router.post('/users/staff', validate(createStaffAccountSchema), adminUsersController.createStaff);

export default router;