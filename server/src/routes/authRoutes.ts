import { Router } from 'express';
import { authController } from '../controllers/authController';
import { userController } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loginValidation, registerValidation, profileUpdateValidation, validateRequest } from '../middleware/validation';
import { authRateLimiter, apiRateLimiter, writeRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes with rate limiting
router.post('/register', authRateLimiter, registerValidation, authController.register);
router.post('/login', authRateLimiter, loginValidation, authController.login);

// Protected routes
router.get('/profile', apiRateLimiter, authMiddleware, authController.getProfile);
router.put(
  '/profile',
  writeRateLimiter,
  authMiddleware,
  profileUpdateValidation,
  validateRequest,
  userController.updateProfile
);

export default router;
