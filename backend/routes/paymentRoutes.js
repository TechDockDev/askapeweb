import express from 'express';
import { createSubscription, verifySubscription, getActivePlans, getPaymentHistory, handleWebhook } from '../controllers/paymentController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.get('/plans', getActivePlans);
router.get('/history', authenticateUser, getPaymentHistory);
router.post('/create-subscription', authenticateUser, createSubscription);
router.post('/verify-subscription', authenticateUser, verifySubscription);
router.post('/webhook', handleWebhook);

export default router;
