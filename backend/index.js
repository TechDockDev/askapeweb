import 'dotenv/config'; // Loads .env automatically
import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { connectDB, isDatabaseConnected } from './config/db.js';
import { AVAILABLE_MODELS } from './config/constants.js';
import { setAuthUserStorage, setAuthUseDatabase } from './middleware/auth.js';
import { setUseDatabase } from './utils/helpers.js';
import { userStorage } from './config/memoryStorage.js';

import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import socketHandler from './socket/socketHandler.js';

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/askape';
const MOCK_MODE = process.env.MOCK_MODE === 'true';

// Create uploads directory
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors('*'));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Database
connectDB(MONGODB_URI).then((connected) => {
    // Inject connection state to helpers/middleware
    setAuthUseDatabase(connected);
    setUseDatabase(connected);

    // Inject storage for middleware
    setAuthUserStorage(userStorage);

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/chat', chatRoutes);
    app.use('/api', userRoutes);
    app.use('/api/admin', adminRoutes);

    // Legacy Routes with Redirects
    app.get('/api/sessions', (req, res) => {
        const { userId, guestId } = req.query;
        res.redirect(`/api/chat/sessions?userId=${userId || ''}&guestId=${guestId || ''}`);
    });

    app.get('/api/sessions/:sessionId', (req, res) => {
        res.redirect(`/api/chat/history/${req.params.sessionId}`);
    });

    app.delete('/api/sessions/:sessionId', (req, res) => {
        // We'll redirect this to the new DELETE endpoint via 307 to preserve method, 
        // OR just handle it here by delegating to logic. Redirecting DELETE is tricky.
        // Let's iterate: easiest is to just forward to the new path if the client follows it,
        // but often clients don't follow redirects for DELETE.
        // Safe bet: just create a new request handler or duplicate logic? 
        // We'll just redirect and hope client follows, or better: 
        res.redirect(307, `/api/chat/sessions/${req.params.sessionId}`);
    });

    // Initialize Socket Handling
    socketHandler(io);

    // Health Check
    app.get('/api/health', (req, res) => {
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            mockMode: MOCK_MODE,
            database: isDatabaseConnected() ? 'mongodb' : 'in-memory',
            realtime: 'socket.io'
        });
    });

    // 404 Handler
    app.use((req, res) => {
        res.status(404).json({ success: false, error: 'Endpoint not found', path: req.path });
    });

    // Global Error Handler
    app.use((err, req, res, next) => {
        console.error('❌ Express Error:', err.message);
        res.status(err.status || 500).json({ success: false, error: err.message || 'Internal server error' });
    });

    // Start Server
    server.listen(PORT, () => {
        console.log('');
        console.log('========================================');
        console.log('  AskApe MULTI-LLM API v1.0 (MVC)');
        console.log('========================================');
        console.log(`🦍 AskApe API running at http://localhost:${PORT}`);
        console.log(`🔌 Socket.IO: ws://localhost:${PORT}`);
        console.log(`📦 Storage: ${connected ? 'MongoDB' : 'In-Memory'}`);
        console.log(`🤖 Mode: ${MOCK_MODE ? 'MOCK' : 'LIVE'}`);
        console.log('');
    });
});
