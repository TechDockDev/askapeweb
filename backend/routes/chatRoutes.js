import express from 'express';
import {
    getSessions,
    getSessionHistory,
    deleteSession,
    updateSessionTitle,
    handleRestChat,
    addParticipant
} from '../controllers/chatController.js';
import { authenticateAPI } from '../middleware/auth.js';

const router = express.Router();

// Session endpoints
router.get('/sessions', getSessions);
router.get('/history/:sessionId', getSessionHistory);
router.delete('/sessions/:sessionId', deleteSession);
router.patch('/sessions/:sessionId', updateSessionTitle);
router.post('/sessions/:sessionId/participants', addParticipant);

// REST Chat endpoint
router.post('/',
    // authenticateAPI, 
    handleRestChat);

export default router;
