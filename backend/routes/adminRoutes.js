import express from 'express';
import { adminLogin, getDashboardStats, createPlan, updatePlan, deletePlan, getPlans, getUsers, getUserDetails } from '../controllers/adminController.js';

const router = express.Router();

// Middleware to verify admin token would go here
const verifyAdmin = (req, res, next) => {
    // Basic placeholder. In real app, use auth middleware + role check
    next();
};

router.post('/login', adminLogin);
router.get('/stats', verifyAdmin, getDashboardStats);
router.post('/plans', verifyAdmin, createPlan);
router.put('/plans/:id', verifyAdmin, updatePlan);
router.delete('/plans/:id', verifyAdmin, deletePlan); // Add this
router.get('/plans', verifyAdmin, getPlans);
router.get('/users', verifyAdmin, getUsers);
router.get('/users/:id', verifyAdmin, getUserDetails);

export default router;
