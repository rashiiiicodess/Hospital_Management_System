import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { registerSchema, loginSchema, acceptInviteSchema } from '../validation/auth.schemas.js';

const router = Router();

// Public auth endpoints
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/invites/:token/accept', validate(acceptInviteSchema), authController.acceptInvite);

// Authenticated current user profile
router.get('/me', authenticate, authController.getMe);

export default router;