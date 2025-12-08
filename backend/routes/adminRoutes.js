import express from 'express';
import { adminLogin, getDashboardStats, createPlan, getPlans, getUsers, getUserDetails } from '../controllers/adminController.js';

const router = express.Router();

// Middleware to verify admin token would go here
const verifyAdmin = (req, res, next) => {
    // Basic placeholder. In real app, use auth middleware + role check
    next();
};

router.post('/login', adminLogin);
router.get('/stats', verifyAdmin, getDashboardStats);
router.post('/plans', verifyAdmin, createPlan);
router.get('/plans', verifyAdmin, getPlans);
router.get('/users', verifyAdmin, getUsers);
router.get('/users/:id', verifyAdmin, getUserDetails);

export default router;
