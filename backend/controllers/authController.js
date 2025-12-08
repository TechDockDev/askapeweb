import crypto from 'crypto';
import User from '../models/User.js';
import { generateToken } from '../utils/helpers.js';
import { isDatabaseConnected } from '../config/db.js';
import { userStorage, sessionStorage, chatStorage } from '../config/memoryStorage.js';
import Session from '../models/Session.js';
import Chat from '../models/Chat.js';

export const googleAuth = async (req, res) => {
    try {
        const { idToken, credential, guestId } = req.body;
        const tokenToUse = idToken || credential;
        const useDatabase = isDatabaseConnected();

        if (!tokenToUse) {
            return res.status(400).json({ success: false, error: 'Google idToken required' });
        }

        let payload;
        try {
            const parts = tokenToUse.split('.');
            payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        } catch (e) {
            return res.status(400).json({ success: false, error: 'Invalid token format' });
        }

        const { email, name, sub: googleId, picture } = payload;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Could not extract email' });
        }

        const token = generateToken();

        let user;
        if (useDatabase) {
            user = await User.findOne({ email });
            if (!user) {
                user = new User({
                    name: name || email.split('@')[0],
                    email,
                    googleId,
                    avatar: name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U',
                    avatarUrl: picture,
                    plan: 'free',
                    totalTokensUsed: 0,
                    apiKey: `ask_${crypto.randomBytes(16).toString('hex')}`,
                    tokens: [token]
                });
                await user.save();
                console.log(`✅ New user created: ${email}`);

                // Migrate guest data to user
                if (guestId) {
                    await Session.updateMany({ guestId }, { userId: user._id.toString() });
                    await Chat.updateMany({ guestId }, { userId: user._id.toString() });

                    // Merge guest token usage
                    const guestUser = await User.findOne({ guestId });
                    if (guestUser) {
                        user.totalTokensUsed += guestUser.totalTokensUsed || 0;
                        await user.save();
                    }
                    console.log(`📦 Migrated guest data to user: ${email}`);
                }
            } else {
                user.tokens = user.tokens || [];
                user.tokens.push(token);
                if (picture && !user.avatarUrl) user.avatarUrl = picture;
                user.updatedAt = new Date();
                await user.save();
            }
        } else {
            user = Array.from(userStorage.values()).find(u => u.email === email);
            if (!user) {
                const uId = crypto.randomUUID();
                user = {
                    id: uId,
                    name: name || email.split('@')[0],
                    email,
                    avatar: name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U',
                    avatarUrl: picture,
                    plan: 'free',
                    totalTokensUsed: 0,
                    tokens: [token]
                };
                userStorage.set(uId, user);
            } else {
                user.tokens = user.tokens || [];
                user.tokens.push(token);
            }
        }

        res.json({
            success: true,
            user: {
                id: user.id || user._id?.toString(),
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                avatarUrl: user.avatarUrl,
                plan: user.plan || 'free',
                totalTokensUsed: user.totalTokensUsed || 0,
                hasPassword: !!user.password
            },
            token
        });

    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ success: false, error: 'Authentication failed' });
    }
};
