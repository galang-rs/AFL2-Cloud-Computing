import { Hono } from 'hono';
import { HonoEnv } from '../types/env';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const authRouter = new Hono<HonoEnv>();
const authController = new AuthController();

// Public auth endpoints
authRouter.post('/register', (c) => authController.register(c));
authRouter.post('/login', (c) => authController.login(c));

// Protected auth endpoints
authRouter.get('/me', authMiddleware, (c) => authController.getMe(c));
