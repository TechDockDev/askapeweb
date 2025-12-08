import crypto from 'crypto';
import Session from '../models/Session.js';
import Chat from '../models/Chat.js';
import { isDatabaseConnected } from '../config/db.js';
import { sessionStorage, chatStorage } from '../config/memoryStorage.js';
import { AVAILABLE_MODELS } from '../config/constants.js';
import { queryHuggingFaceChat } from '../utils/huggingface.js';
import { estimateTokens, updateUserTokenUsage } from '../utils/helpers.js';

const MOCK_MODE = process.env.MOCK_MODE === 'true';

// Helper to generate mock response
function generateMockResponse(model, prompt) {
    const modelName = model.split('/').pop();
    return `This is a mock response from **${modelName}** for your query:\n\n"${prompt.substring(0, 50)}..."\n\n### Key Points:\n1. First point about your question\n2. Second relevant insight\n3. Third consideration\n\n_Response generated in mock mode._`;
}

export const getSessions = async (req, res) => {
    try {
        const { userId, guestId } = req.query;
        const useDatabase = isDatabaseConnected();

        if (!userId && !guestId) {
            return res.status(400).json({ success: false, error: 'userId or guestId required' });
        }

        let sessions = [];

        if (useDatabase) {
            const query = userId ? { userId } : { guestId };
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
                .filter(s => s.userId === userId || s.guestId === guestId)
                .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
        }

        res.json({
            success: true,
            count: sessions.length,
            sessions: sessions.map(s => ({
                sessionId: s.sessionId,
                title: s.title || 'New Chat',
                messageCount: s.messageCount || 0,
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
                messages = await Chat.find({ sessionId }).sort({ createdAt: 1 }).lean();
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
                title: session.title,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt
            },
            messageCount: messages.length,
            messages: messages.map(m => ({
                id: m.messageId || m.id,
                role: m.role,
                content: m.content,
                tokensUsed: m.tokensUsed || 0,
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
