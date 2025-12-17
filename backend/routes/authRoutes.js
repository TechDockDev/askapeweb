import express from 'express';
import { googleAuth, getMe } from '../controllers/authController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.post('/google', googleAuth);
router.get('/me', authenticateUser, getMe);

export default router;
