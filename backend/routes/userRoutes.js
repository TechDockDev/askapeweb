import express from 'express';
import { getUserUsage, getModels, searchUsers } from '../controllers/userController.js';

const router = express.Router();

router.get('/usage', getUserUsage);
router.get('/models', getModels);
router.get('/search', searchUsers);

export default router;
