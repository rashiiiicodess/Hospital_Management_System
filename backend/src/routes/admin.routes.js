import { Router } from 'express';
import * as adminUsersController from '../controllers/adminUsers.controller.js';
import * as adminOpsController from '../controllers/adminOps.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createDoctorAccountSchema,
  createStaffAccountSchema,
  updateAccountStatusSchema,
} from '../validation/accounts.schemas.js';
import * as adminStatsController from '../controllers/adminStats.controller.js';
const router = Router();

// All admin routes strictly require admin role
router.use(authenticate, authorize('admin'));

// 1. Staff Onboarding
router.post('/users/doctors', validate(createDoctorAccountSchema), adminUsersController.createDoctor);
router.post('/users/staff', validate(createStaffAccountSchema), adminUsersController.createStaff);

// 2. User Management
router.get('/users', adminUsersController.listUsers);
router.patch('/users/:id/status', validate(updateAccountStatusSchema), adminUsersController.updateStatus);

// 3. Clinical Audit Logs Viewer
router.get('/audit-log', adminOpsController.getAuditLogs);

// 4. Admin Dashboard Analytics
router.get('/stats/summary', adminStatsController.getSummary);
router.get('/stats/by-status', adminStatsController.getByStatus);
router.get('/stats/by-department', adminStatsController.getByDepartment);
export default router;