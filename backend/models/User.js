import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    password: String,
    googleId: String,
    isGuest: { type: Boolean, default: false },
    guestId: { type: String, index: true, sparse: true },
    avatar: String,
    avatarUrl: String,
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    plan: { type: String, default: 'free'},
    planExpiry: Date,
    apiKey: String,
    tokenBalance: { type: Number, default: 2000 },
    tokens: [String],
    totalTokensUsed: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
export default User;
