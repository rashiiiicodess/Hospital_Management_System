import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import departmentsRoutes from './departments.routes.js';
import adminRoutes from './admin.routes.js';
import doctorsRoutes from './doctors.routes.js';
import appointmentsRoutes from './appointments.routes.js';
import patientsRoutes from './patients.routes.js';
import recordsRoutes from './records.routes.js';
import prescriptionsRoutes from './prescriptions.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/departments', departmentsRoutes);
router.use('/admin', adminRoutes);
router.use('/doctors', doctorsRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/patients', patientsRoutes);
router.use('/', recordsRoutes);
router.use('/', prescriptionsRoutes); // Mounts /appointments/:id/prescription & /pdf

export default router;