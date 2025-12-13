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

            // Access Control & room joining
            // Guests behave as if useDatabase is false (no persistence)
            if (useDatabase && sessionId && currentUserId) {
                try {
                    const session = await Session.findOne({ sessionId });
                    if (session) {
                        // Check if user is owner or participant
                        const isOwner = session.userId === currentUserId;
                        const isParticipant = session.participants && session.participants.includes(currentUserId);

                        if (!isOwner && !isParticipant) {
                            socket.emit('error', { message: 'Access denied: You are not a member of this chat.' });
                            return;
                        }
                    }
                } catch (e) {
                    console.error('Session check error', e);
                }
            }

            socket.join(sessionId);
            console.log(`📥 Client joined session: ${sessionId}`);

            if (!currentUserId) {
                await getOrCreateGuestUser(currentGuestId);
            }

            // Removed eager session creation. Session will be created on first message.
            try {
                if (useDatabase) {
                    // Lazy creation: Do nothing here. Session will be created on first message.
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

            let participants = [];
            if (useDatabase && sessionId) {
                const sessionData = await Session.findOne({ sessionId }).populate('participants', 'name email avatar');
                if (sessionData && sessionData.participants) {
                    participants = sessionData.participants;
                }
                // Add owner to participants list if not already there (for display)
                if (sessionData && sessionData.userId) {
                    // Check if owner is already in participants array (it shouldn't be by schema design usually, but let's be safe)
                    // Actually owner sits in 'userId'. We should fetch owner details too.
                    const owner = await User.findById(sessionData.userId).select('name email avatar');
                    if (owner && !participants.find(p => p._id.toString() === owner._id.toString())) {
                        participants.unshift(owner);
                    }
                }
            }

            socket.emit('session_joined', {
                sessionId,
                guestId: currentGuestId,
                usingDatabase: useDatabase,
                participants,
                ownerId: (useDatabase && sessionId) ? (await Session.findOne({ sessionId }))?.userId : null
            });

            try {
                let history = [];
                // ONLY load history for logged-in users. Guests get ephemeral chat (no history on refresh).
                // ONLY load history for logged-in users. Guests get ephemeral chat.
                // Guests using DB will just get empty history (since nothing saved)
                if (currentUserId) {
                    if (useDatabase) {
                        // Fetch only last 50 messages for initial load
                        const messages = await Chat.find({ sessionId })
                            .sort({ createdAt: -1 }) // Get newest first
                            .limit(50)
                            .populate('userId', 'name avatar'); // Populate sender info

                        // Reverse to be chronological
                        history = messages.reverse().map(m => ({
                            id: m.messageId,
                            role: m.role,
                            content: m.content,
                            sender: m.role === 'USER' && m.userId && m.userId._id ? {
                                name: m.userId.name,
                                avatar: m.userId.avatar
                            } : undefined,
                            tokensUsed: m.tokensUsed || 0,
                            aiResponses: m.aiResponses || [],
                            createdAt: m.createdAt
                        }));
                    } else {
                        const session = sessionStorage.get(sessionId);
                        history = session?.messages || [];
                        // Limit memory history too if needed, but less critical
                    }
                }
                socket.emit('session_history', history);
            } catch (err) {
                console.error('Error loading history:', err);
                socket.emit('session_history', []);
            }
        });

        socket.on('fetch_history', async (data) => {
            const { sessionId, beforeId, limit = 50 } = data;
            if (!sessionId || !beforeId) return;

            try {
                if (useDatabase) {
                    // Find the message to pivot from
                    const pivotMsg = await Chat.findOne({ messageId: beforeId }).select('createdAt');
                    if (!pivotMsg) {
                        socket.emit('history_chunk', { sessionId, messages: [], hasMore: false });
                        return;
                    }

                    const messages = await Chat.find({
                        sessionId,
                        createdAt: { $lt: pivotMsg.createdAt }
                    })
                        .sort({ createdAt: -1 })
                        .limit(limit)
                        .populate('userId', 'name avatar');

                    const history = messages.reverse().map(m => ({
                        id: m.messageId,
                        role: m.role,
                        content: m.content,
                        sender: m.role === 'USER' && m.userId && m.userId._id ? {
                            name: m.userId.name,
                            avatar: m.userId.avatar
                        } : undefined,
                        tokensUsed: m.tokensUsed || 0,
                        aiResponses: m.aiResponses || [],
                        createdAt: m.createdAt
                    }));

                    // Check if there are more
                    let hasMore = false;
                    if (messages.length === limit) {
                        // Check if there is anything older than the oldest message we just fetched
                        // The oldest message in 'messages' (which is sorted -1) is the LAST one in the list (index length-1)
                        const oldestMsg = messages[0]; // wait. 
                        // messages: [newest ... oldest] (because sort -1)
                        // reversed for history: [oldest ... newest]

                        // In 'messages' (from DB sort -1):
                        // index 0: 2nd newest (closest to pivot)
                        // index last: oldest

                        // Actually:
                        // 10 messages. 
                        // 10 (newest) ... 1 (oldest).
                        // Pivot is 15.
                        // query < 15, sort -1 limit 5.
                        // Result: 14, 13, 12, 11, 10.
                        // history (reversed): 10, 11, 12, 13, 14.

                        // Oldest fetched is 10. (index last in 'messages', index 0 in 'history')

                        const oldestInBatch = messages[messages.length - 1]; // This is 10.
                        const olderCount = await Chat.countDocuments({
                            sessionId,
                            createdAt: { $lt: oldestInBatch.createdAt }
                        });
                        hasMore = olderCount > 0;
                    }

                    socket.emit('history_chunk', { sessionId, messages: history, hasMore });
                }
            } catch (err) {
                console.error('Error fetching history chunk:', err);
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
                                // guestId: effectiveGuestId, // Removed guestId persistence
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
                        // Use <= 1 to catch the first message reliably
                        const title = msgCount <= 1 ? message.substring(0, 50) : undefined;

                        const updateOps = {
                            $inc: { messageCount: 1 },
                            $set: { updatedAt: new Date() }
                        };

                        if (title) {
                            updateOps.$set.title = title;
                        }

                        console.log(`📝 Creating/Updating session ${sessionId} for user ${effectiveUserId}. Title: ${title}`);

                        // Lazy creation: Upsert session on every message to ensure it exists
                        await Session.findOneAndUpdate(
                            { sessionId },
                            {
                                $setOnInsert: {
                                    sessionId,
                                    userId: effectiveUserId,
                                    // guestId: effectiveGuestId,
                                    // title: title || 'New Chat',
                                    isActive: true,
                                    totalTokensUsed: 0,
                                    createdAt: new Date()
                                },
                                ...updateOps
                            },
                            { upsert: true, new: true }
                        );
                    } catch (sessionErr) {
                        console.error('❌ Session creation/update failed:', sessionErr);
                    }
                } else {
                    const session = sessionStorage.get(sessionId) || { sessionId, messages: [] };
                    session.messages.push({ id: messageId, role: 'USER', content: message, aiResponses: [] });
                    sessionStorage.set(sessionId, session);
                }

                socket.emit('message_saved', { id: messageId, stored: useDatabase ? 'mongodb' : 'memory' });

                // Broadcast user message to others in the room so they see the prompt
                let senderInfo = {};
                if (useDatabase && effectiveUserId) {
                    const sender = await User.findById(effectiveUserId).select('name avatar');
                    if (sender) {
                        senderInfo = { name: sender.name, avatar: sender.avatar };
                    }
                }

                socket.to(sessionId).emit('user_message', {
                    id: messageId,
                    role: 'USER',
                    content: message,
                    userId: effectiveUserId,
                    sender: senderInfo,
                    guestId: effectiveGuestId,
                    createdAt: new Date()
                });

            } catch (err) {
                socket.emit('message_saved', { id: messageId, stored: 'failed', error: err.message });
            }

            const conversationContext = await buildConversationContext(sessionId, message);
            const aiResponseId = crypto.randomUUID();

            io.to(sessionId).emit('streaming_started', {
                sessionId,
                messageId: aiResponseId,
                models: selectedModels.map(id => ({ id, name: id.split('/').pop() }))
            });

            const modelPromises = selectedModels.map(async (modelId) => {
                const modelName = modelId.split('/').pop();
                io.to(sessionId).emit('model_streaming_start', { modelId, modelName });

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
                            chunkCount++;
                            io.to(sessionId).emit('message_chunk', {
                                sessionId,
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
                            chunkCount++;
                            io.to(sessionId).emit('message_chunk', {
                                sessionId,
                                modelId,
                                modelName,
                                chunk: full.slice(-chunk.length),
                                fullContent: full,
                                chunkIndex: chunkCount
                            });
                        });
                    }

                    const responseTokens = estimateTokens(fullContent);

                    io.to(sessionId).emit('model_streaming_complete', {
                        sessionId,
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
                    io.to(sessionId).emit('model_error', { sessionId, modelId, modelName, error: error.message });
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
                if (useDatabase && effectiveUserId && aiResponses.length > 0) {
                    await Chat.findOneAndUpdate(
                        { messageId: aiResponseId },
                        {
                            $setOnInsert: {
                                sessionId,
                                messageId: aiResponseId,
                                userId: effectiveUserId,
                                // guestId: effectiveGuestId, // Guests don't get DB records
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

                } else if (!useDatabase || !effectiveUserId) {
                    const session = sessionStorage.get(sessionId);
                    if (session) {
                        session.messages.push({ id: aiResponseId, role: 'AI', content: '', aiResponses });
                    }
                }
            } catch (err) {
                socket.emit('error', { type: 'save_error', message: 'Failed to save AI response' });
            }

            io.to(sessionId).emit('all_responses_complete', { sessionId, modelsCompleted: aiResponses.length });
        });

        socket.on('leave_session', (sessionId) => {
            if (sessionId) {
                socket.leave(sessionId);
                console.log(`out Client left session: ${sessionId}`);
            }
        });
        socket.on('input_change', (data) => {
            const { sessionId, content, userId } = data;
            if (sessionId) {
                // Broadcast to others in the room
                socket.to(sessionId).emit('input_changed', { sessionId, content, userId });
            }
        });

        socket.on('typing_start', (data) => {
            const { sessionId, user } = data;
            if (sessionId && user) {
                socket.to(sessionId).emit('typing_started', { sessionId, user });
            }
        });

        socket.on('typing_stop', (data) => {
            const { sessionId, user } = data;
            if (sessionId && user) {
                socket.to(sessionId).emit('typing_stopped', { sessionId, user });
            }
        });

        socket.on('member_added', (data) => {
            // Broadcast to everyone in the room (including sender if needed, but sender usually knows)
            // data: { sessionId, member: { name, email, avatar } }
            if (data && data.sessionId) {
                socket.to(data.sessionId).emit('system_notification', {
                    type: 'member_joined',
                    message: `${data.member.name || 'A new member'} joined the conversation.`,
                    member: data.member
                });
            }
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Socket.IO client disconnected: ${socket.id}`);
        });
    });
}
