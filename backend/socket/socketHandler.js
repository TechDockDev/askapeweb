import crypto from 'crypto';
import Session from '../models/Session.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { isDatabaseConnected } from '../config/db.js';
import { AVAILABLE_MODELS } from '../config/constants.js';
import { sessionStorage, chatStorage, userStorage } from '../config/memoryStorage.js';
import {
    generateGuestId,
    generateToken,
    estimateTokens,
    updateUserTokenUsage
} from '../utils/helpers.js';
import { queryHuggingFaceStream } from '../utils/huggingface.js';

const MOCK_MODE = process.env.MOCK_MODE === 'true';

// Helper functions (duplicated locally if needed or imported)
async function getOrCreateGuestUser(guestId) {
    const useDatabase = isDatabaseConnected();
    if (!guestId) {
        guestId = generateGuestId();
    }

    if (useDatabase) {
        try {
            const user = await User.findOneAndUpdate(
                { guestId },
                {
                    $setOnInsert: {
                        name: 'Guest User',
                        isGuest: true,
                        guestId,
                        avatar: 'GU',
                        plan: 'free',
                        totalTokensUsed: 0,
                        apiKey: `ask_guest_${crypto.randomBytes(8).toString('hex')}`,
                        createdAt: new Date()
                    }
                },
                { upsert: true, new: true }
            );
            return user;
        } catch (err) {
            if (err.code === 11000) {
                const existingUser = await User.findOne({ guestId });
                if (existingUser) return existingUser;
            }
            return { guestId, name: 'Guest User', isGuest: true, plan: 'free', totalTokensUsed: 0 };
        }
    } else {
        let user = userStorage.get(guestId);
        if (!user) {
            user = {
                id: guestId,
                name: 'Guest User',
                isGuest: true,
                guestId,
                avatar: 'GU',
                plan: 'free',
                totalTokensUsed: 0,
                createdAt: new Date()
            };
            userStorage.set(guestId, user);
        }
        return user;
    }
}

async function buildConversationContext(sessionId, currentMessage, maxContextMessages = 10) {
    const useDatabase = isDatabaseConnected();
    let contextMessages = [];

    try {
        if (useDatabase) {
            const previousMessages = await Chat.find({ sessionId })
                .sort({ createdAt: -1 })
                .limit(maxContextMessages * 2)
                .lean();

            previousMessages.reverse();

            for (const msg of previousMessages) {
                if (msg.role === 'USER') {
                    contextMessages.push({ role: 'user', content: msg.content });
                } else if (msg.role === 'AI' && msg.aiResponses?.length > 0) {
                    const aiResponse = msg.aiResponses[0]?.content;
                    if (aiResponse) {
                        contextMessages.push({ role: 'assistant', content: aiResponse });
                    }
                }
            }
        } else {
            const session = sessionStorage.get(sessionId);
            if (session?.messages) {
                const lastMessages = session.messages.slice(-maxContextMessages * 2);
                for (const msg of lastMessages) {
                    if (msg.role === 'USER') {
                        contextMessages.push({ role: 'user', content: msg.content });
                    } else if (msg.role === 'AI' && msg.aiResponses?.length > 0) {
                        contextMessages.push({ role: 'assistant', content: msg.aiResponses[0]?.content });
                    }
                }
            }
        }
    } catch (err) {
        console.error('Error building context:', err);
    }

    contextMessages.push({ role: 'user', content: currentMessage });

    if (contextMessages.length > maxContextMessages) {
        contextMessages = contextMessages.slice(-maxContextMessages);
    }

    return contextMessages;
}

function generateMockResponse(model, prompt) {
    const modelName = model.split('/').pop();
    return `This is a mock response from **${modelName}** for your query:\n\n"${prompt.substring(0, 50)}..."\n\n### Key Points:\n1. First point about your question\n2. Second relevant insight\n3. Third consideration\n\n_Response generated in mock mode._`;
}

export default function socketHandler(io) {
    io.on('connection', (socket) => {
        console.log(`🔌 Socket.IO client connected: ${socket.id}`);
        let currentGuestId = null;
        let currentUserId = null;
        const useDatabase = isDatabaseConnected();

        socket.on('join_session', async (data) => {
            const { sessionId, userId, guestId } = data;

            if (!sessionId) {
                socket.emit('error', { message: 'Session ID required' });
                return;
            }

            currentUserId = userId;
            currentGuestId = guestId || generateGuestId();

            socket.join(sessionId);
            console.log(`📥 Client joined session: ${sessionId}`);

            if (!currentUserId) {
                await getOrCreateGuestUser(currentGuestId);
            }

            try {
                if (useDatabase) {
                    await Session.findOneAndUpdate(
                        { sessionId },
                        {
                            $setOnInsert: {
                                sessionId,
                                userId: currentUserId,
                                guestId: currentGuestId,
                                title: 'New Chat',
                                isActive: true,
                                messageCount: 0,
                                totalTokensUsed: 0,
                                createdAt: new Date()
                            },
                            $set: { updatedAt: new Date() }
                        },
                        { upsert: true, new: true }
                    );
                } else {
                    if (!sessionStorage.has(sessionId)) {
                        sessionStorage.set(sessionId, {
                            sessionId,
                            userId: currentUserId,
                            guestId: currentGuestId,
                            messages: [],
                            title: 'New Chat'
                        });
                    }
                }
            } catch (err) {
                console.error('❌ Session error:', err.message);
            }

            socket.emit('session_joined', {
                sessionId,
                guestId: currentGuestId,
                usingDatabase: useDatabase
            });

            try {
                let history = [];
                if (useDatabase) {
                    const messages = await Chat.find({ sessionId }).sort({ createdAt: 1 });
                    history = messages.map(m => ({
                        id: m.messageId,
                        role: m.role,
                        content: m.content,
                        tokensUsed: m.tokensUsed || 0,
                        aiResponses: m.aiResponses || [],
                        createdAt: m.createdAt
                    }));
                } else {
                    const session = sessionStorage.get(sessionId);
                    history = session?.messages || [];
                }
                socket.emit('session_history', history);
            } catch (err) {
                console.error('Error loading history:', err);
                socket.emit('session_history', []);
            }
        });

        socket.on('message', async (data) => {
            const { sessionId, message, modelIds = [], userId, guestId } = data;

            if (!sessionId || !message) {
                socket.emit('error', { message: 'Session ID and message are required' });
                return;
            }

            const effectiveUserId = userId || currentUserId;
            const effectiveGuestId = guestId || currentGuestId || generateGuestId();
            const messageId = crypto.randomUUID();
            const selectedModels = modelIds.length > 0
                ? modelIds
                : AVAILABLE_MODELS.filter(m => m.isDefault).map(m => m.id);

            console.log(`🤖 Processing message for models: ${selectedModels.join(', ')}`);

            const promptTokens = estimateTokens(message);

            try {
                if (useDatabase) {
                    await Chat.findOneAndUpdate(
                        { messageId },
                        {
                            $setOnInsert: {
                                sessionId,
                                messageId,
                                userId: effectiveUserId,
                                guestId: effectiveGuestId,
                                role: 'USER',
                                content: message,
                                tokensUsed: promptTokens,
                                createdAt: new Date()
                            }
                        },
                        { upsert: true, new: true }
                    );

                    try {
                        const msgCount = await Chat.countDocuments({ sessionId, role: 'USER' });
                        if (msgCount === 1) {
                            await Session.findOneAndUpdate(
                                { sessionId },
                                {
                                    title: message.substring(0, 50),
                                    messageCount: 1,
                                    updatedAt: new Date()
                                }
                            );
                        } else {
                            await Session.findOneAndUpdate(
                                { sessionId },
                                { $inc: { messageCount: 1 }, updatedAt: new Date() }
                            );
                        }
                    } catch (sessionErr) { }
                } else {
                    const session = sessionStorage.get(sessionId) || { sessionId, messages: [] };
                    session.messages.push({ id: messageId, role: 'USER', content: message, aiResponses: [] });
                    sessionStorage.set(sessionId, session);
                }
                socket.emit('message_saved', { id: messageId, stored: useDatabase ? 'mongodb' : 'memory' });
            } catch (err) {
                socket.emit('message_saved', { id: messageId, stored: 'failed', error: err.message });
            }

            const conversationContext = await buildConversationContext(sessionId, message);
            const aiResponseId = crypto.randomUUID();

            socket.emit('streaming_started', {
                sessionId,
                messageId: aiResponseId,
                models: selectedModels.map(id => ({ id, name: id.split('/').pop() }))
            });

            const modelPromises = selectedModels.map(async (modelId) => {
                const modelName = modelId.split('/').pop();
                socket.emit('model_streaming_start', { modelId, modelName });

                try {
                    let fullContent = '';
                    let chunkCount = 0;

                    if (MOCK_MODE) {
                        const mockText = generateMockResponse(modelId, message);
                        const chunkSize = Math.floor(Math.random() * 5) + 2;
                        for (let i = 0; i < mockText.length; i += chunkSize) {
                            const chunk = mockText.substring(i, i + chunkSize);
                            fullContent += chunk;
                            chunkCount++;
                            socket.emit('message_chunk', {
                                modelId,
                                modelName,
                                chunk,
                                fullContent,
                                chunkIndex: chunkCount
                            });
                            await new Promise(r => setTimeout(r, Math.random() * 30 + 10));
                        }
                    } else {
                        await queryHuggingFaceStream(modelId, conversationContext, (chunk, full) => {
                            fullContent = full;
                            chunkCount++;
                            socket.emit('message_chunk', {
                                modelId,
                                modelName,
                                chunk: full.slice(-chunk.length),
                                fullContent: full,
                                chunkIndex: chunkCount
                            });
                        });
                    }

                    const responseTokens = estimateTokens(fullContent);

                    socket.emit('model_streaming_complete', {
                        modelId,
                        modelName,
                        id: aiResponseId,
                        content: fullContent,
                        tokensUsed: responseTokens,
                        chunkCount
                    });

                    return {
                        success: true,
                        modelId,
                        content: fullContent,
                        tokensUsed: responseTokens,
                        createdAt: new Date()
                    };

                } catch (error) {
                    socket.emit('model_error', { modelId, modelName, error: error.message });
                    return { success: false, modelId, error: error.message };
                }
            });

            const results = await Promise.all(modelPromises);

            const aiResponses = results
                .filter(r => r.success)
                .map(r => ({
                    modelId: r.modelId,
                    content: r.content,
                    tokensUsed: r.tokensUsed,
                    createdAt: r.createdAt
                }));

            const totalAiTokens = aiResponses.reduce((sum, r) => sum + r.tokensUsed, 0);

            try {
                if (useDatabase && aiResponses.length > 0) {
                    await Chat.findOneAndUpdate(
                        { messageId: aiResponseId },
                        {
                            $setOnInsert: {
                                sessionId,
                                messageId: aiResponseId,
                                userId: effectiveUserId,
                                guestId: effectiveGuestId,
                                role: 'AI',
                                content: '',
                                createdAt: new Date()
                            },
                            $set: {
                                tokensUsed: totalAiTokens,
                                aiResponses
                            }
                        },
                        { upsert: true, new: true }
                    );

                    const totalTokens = promptTokens + totalAiTokens;
                    updateUserTokenUsage(effectiveUserId, effectiveGuestId, totalTokens).catch(() => { });
                    Session.findOneAndUpdate(
                        { sessionId },
                        { $inc: { totalTokensUsed: totalTokens }, updatedAt: new Date() }
                    ).catch(() => { });

                } else if (!useDatabase) {
                    const session = sessionStorage.get(sessionId);
                    if (session) {
                        session.messages.push({ id: aiResponseId, role: 'AI', content: '', aiResponses });
                    }
                }
            } catch (err) {
                socket.emit('error', { type: 'save_error', message: 'Failed to save AI response' });
            }

            socket.emit('all_responses_complete', { sessionId, modelsCompleted: aiResponses.length });
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Socket.IO client disconnected: ${socket.id}`);
        });
    });
}
