import crypto from 'crypto';
import Session from '../models/Session.js';
import Chat from '../models/Chat.js';
import { isDatabaseConnected } from '../config/db.js';
import { sessionStorage, chatStorage } from '../config/memoryStorage.js';
import { AVAILABLE_MODELS } from '../config/constants.js';
import { queryHuggingFaceChat } from '../utils/huggingface.js';
import { estimateTokens, updateUserTokenUsage } from '../utils/helpers.js';
import { CLIENT_RENEG_LIMIT } from 'tls';

const MOCK_MODE = process.env.MOCK_MODE === 'true';

// Helper to generate mock response
function generateMockResponse(model, prompt) {
    const modelName = model.split('/').pop();
    return `This is a mock response from **${modelName}** for your query:\n\n"${prompt.substring(0, 50)}..."\n\n### Key Points:\n1. First point about your question\n2. Second relevant insight\n3. Third consideration\n\n_Response generated in mock mode._`;
}

export const getSessions = async (req, res) => {
    try {
        const { userId } = req.query;
        console.log("Query--->", req.query);
        console.log("userId--->", userId);
        const useDatabase = isDatabaseConnected();

        if (!userId) {
            return res.status(400).json({ success: false, error: 'userId required' });
        }

        let sessions = [];

        if (useDatabase) {
            const query = { $or: [{ userId }, { participants: userId }] };
            sessions = await Session.find(query)
                .sort({ updatedAt: -1 })
                .limit(50)
                .lean();

            for (let session of sessions) {
                const count = await Chat.countDocuments({ sessionId: session.sessionId });
                session.messageCount = count;
            }
        } else {
            sessions = Array.from(sessionStorage.values())
                .filter(s => s.userId === userId)
                .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
        }

        res.json({
            success: true,
            count: sessions.length,
            sessions: sessions.map(s => ({
                sessionId: s.sessionId,
                title: s.title || 'New Chat',
                messageCount: s.messageCount || 0,
                participantsCount: s.participants ? s.participants.length : 0,
                participantsCount: s.participants ? s.participants.length : 0,
                ownerId: s.userId,
                createdAt: s.createdAt,
                updatedAt: s.updatedAt
            }))
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getSessionHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const useDatabase = isDatabaseConnected();

        let session = null;
        let messages = [];

        if (useDatabase) {
            session = await Session.findOne({ sessionId }).lean();
            if (session) {
                messages = await Chat.find({ sessionId })
                    .sort({ createdAt: 1 })
                    .populate('userId', 'name avatar') // Populate sender info
                    .lean();
            }
        } else {
            session = sessionStorage.get(sessionId);
            messages = session?.messages || [];
        }

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        res.json({
            success: true,
            session: {
                sessionId: session.sessionId,
                sessionId: session.sessionId,
                title: session.title,
                ownerId: session.userId,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt
            },
            messageCount: messages.length,
            messages: messages.map(m => ({
                id: m.messageId || m.id,
                role: m.role,
                content: m.content,
                toeknsUsed: m.tokensUsed || 0,
                sender: m.role === 'USER' && m.userId && m.userId._id ? {
                    name: m.userId.name,
                    avatar: m.userId.avatar
                } : undefined,
                aiResponses: m.aiResponses || [],
                createdAt: m.createdAt
            }))
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const deleteSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const useDatabase = isDatabaseConnected();

        if (useDatabase) {
            const session = await Session.findOne({ sessionId });
            if (!session) {
                return res.status(404).json({ success: false, error: 'Session not found' });
            }

            await Chat.deleteMany({ sessionId });
            await Session.deleteOne({ sessionId });
            console.log(`🗑️ Deleted session: ${sessionId}`);
        } else {
            sessionStorage.delete(sessionId);
        }

        res.json({ success: true, message: 'Session deleted' });
    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const updateSessionTitle = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { title } = req.body;
        const useDatabase = isDatabaseConnected();

        if (!title) {
            return res.status(400).json({ success: false, error: 'Title required' });
        }

        if (useDatabase) {
            const session = await Session.findOneAndUpdate(
                { sessionId },
                { title, updatedAt: new Date() },
                { new: true }
            );
            if (!session) {
                return res.status(404).json({ success: false, error: 'Session not found' });
            }
            res.json({ success: true, session });
        } else {
            const session = sessionStorage.get(sessionId);
            if (!session) {
                return res.status(404).json({ success: false, error: 'Session not found' });
            }
            session.title = title;
            res.json({ success: true, session });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const addParticipant = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { userId } = req.body;
        const useDatabase = isDatabaseConnected();

        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID required' });
        }

        if (useDatabase) {
            const session = await Session.findOne({ sessionId });
            if (!session) {
                return res.status(404).json({ success: false, error: 'Session not found' });
            }

            // Check if already participant or owner
            if (session.userId === userId || session.participants?.includes(userId)) {
                return res.status(400).json({ success: false, error: 'User already in session' });
            }

            session.participants = session.participants || [];
            session.participants.push(userId);
            await session.save();

            res.json({ success: true, session });
        } else {
            // Memory mode not fully supported for multi-user but logic remains same
            const session = sessionStorage.get(sessionId);
            if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

            session.participants = session.participants || [];
            if (!session.participants.includes(userId)) {
                session.participants.push(userId);
            }
            res.json({ success: true, session });
        }
    } catch (error) {
        console.error('Add participant error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleRestChat = async (req, res) => {
    try {
        const { prompt, model, options = {}, guestId } = req.body;

        if (!prompt) {
            return res.status(400).json({ success: false, error: 'Prompt required' });
        }

        const selectedModel = model || AVAILABLE_MODELS.find(m => m.isDefault)?.id;

        let response;
        if (MOCK_MODE) {
            response = { content: generateMockResponse(selectedModel, prompt), usage: {} };
        } else {
            response = await queryHuggingFaceChat(selectedModel, prompt, options);
        }

        const promptTokens = estimateTokens(prompt);
        const responseTokens = estimateTokens(response.content);
        const totalTokens = promptTokens + responseTokens;

        // Update token usage
        await updateUserTokenUsage(null, guestId || 'api_user', totalTokens);

        res.json({
            success: true,
            data: {
                chatId: crypto.randomUUID(),
                prompt,
                model: selectedModel,
                response: response.content,
                tokensUsed: totalTokens,
                createdAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
