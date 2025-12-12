import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, index: true },
    messageId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    guestId: { type: String, index: true },
    role: { type: String, enum: ['USER', 'AI'], required: true },
    content: String,
    tokensUsed: { type: Number, default: 0 },
    aiResponses: [{
        modelId: String,
        content: String,
        tokensUsed: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

chatSchema.index({ sessionId: 1, createdAt: 1 });
chatSchema.index({ guestId: 1, createdAt: -1 });
chatSchema.index({ userId: 1, createdAt: -1 });

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
