import crypto from 'crypto';
import User from '../models/User.js';

let useDatabase = false;

// We need to know if DB is used to update tokens correctly
export const setUseDatabase = (value) => {
    useDatabase = value;
};

export function generateGuestId() {
    return `guest_${crypto.randomBytes(8).toString('hex')}`;
}

export function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

export function hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'askape_salt').digest('hex');
}

export function estimateTokens(text) {
    // Rough estimation: ~4 characters per token
    return Math.ceil((text || '').length / 4);
}

export async function updateUserTokenUsage(userId, guestId, tokensUsed) {
    try {
        if (useDatabase) {
            if (userId) {
                await User.findByIdAndUpdate(userId, {
                    $inc: { totalTokensUsed: tokensUsed },
                    updatedAt: new Date()
                });
            } else if (guestId) {
                await User.findOneAndUpdate(
                    { guestId },
                    { $inc: { totalTokensUsed: tokensUsed }, updatedAt: new Date() }
                );
            }
        }
    } catch (err) {
        console.error('Error updating token usage:', err);
    }
}
