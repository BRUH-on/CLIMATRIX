import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/requireAuth';

export const authRouter = Router();

// Public
authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);

// Protected
authRouter.get('/me', requireAuth, authController.me);
