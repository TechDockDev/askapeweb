import express from 'express';
import { getUserUsage, getModels } from '../controllers/userController.js';

const router = express.Router();

router.get('/usage', getUserUsage);
router.get('/models', getModels);

export default router;
