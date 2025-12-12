import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    // guestId: { type: String, index: true }, // Removed
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    title: { type: String, default: 'New Chat' },
    modelIds: [String],
    messageCount: { type: Number, default: 0 },
    totalTokensUsed: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Session = mongoose.model('Session', sessionSchema);
export default Session;
