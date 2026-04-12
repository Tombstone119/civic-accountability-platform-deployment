import { Router } from 'express';
import authRoutes from './authRoutes';
import contractRoutes from './contractRoutes';
import spendingRoutes from './spendingRoutes';
import vendorRoutes from './vendorRoutes';
import paymentRoutes from './paymentRoutes';
import auditRoutes from './auditRoutes';
import departmentRoutes from './departmentRoutes';
import userRoutes from './userRoutes';
import publicRoutes from './publicRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/contracts', contractRoutes);
router.use('/spending', spendingRoutes);
router.use('/vendors', vendorRoutes);
router.use('/payments', paymentRoutes);
router.use('/audits', auditRoutes);
router.use('/departments', departmentRoutes);
router.use('/users', userRoutes);
router.use('/public', publicRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

export default router;
