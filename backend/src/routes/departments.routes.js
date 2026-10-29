import { Router } from 'express';
import * as departmentsController from '../controllers/departments.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createDepartmentSchema } from '../validation/departments.schemas.js';

const router = Router();

// Any logged-in user can view departments
router.get('/', authenticate, departmentsController.listDepartments);

// Only admins can create departments
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createDepartmentSchema),
  departmentsController.createDepartment
);

export default router;