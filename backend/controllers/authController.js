import crypto from 'crypto';
import User from '../models/User.js';
import { generateToken, hashPassword, comparePassword } from '../utils/helpers.js';
import { isDatabaseConnected } from '../config/db.js';
import { userStorage, sessionStorage, chatStorage } from '../config/memoryStorage.js';
import Session from '../models/Session.js';
import Chat from '../models/Chat.js';
import admin from '../config/firebaseAdmin.js';

// ---- Existing Google Auth (Updated) ----
export const googleAuth = async (req, res) => {
    try {
        const { idToken, credential, guestId } = req.body;
        const tokenToUse = idToken || credential;
        const useDatabase = isDatabaseConnected();

        if (!tokenToUse) {
            return res.status(400).json({ success: false, error: 'Google idToken required' });
        }

        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(tokenToUse);
        } catch (e) {
            console.error('Firebase Token Verification Failed:', e);
            return res.status(401).json({ success: false, error: 'Invalid Google Token' });
        }

        const { email, name, uid: googleId, picture } = decodedToken;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Could not extract email' });
        }

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
                    apiKey: `ask_${crypto.randomBytes(16).toString('hex')}`
                });
                await user.save();
                console.log(`✅ New user created (Google): ${email}`);

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
                if (picture && !user.avatarUrl) user.avatarUrl = picture;
                if (!user.googleId) user.googleId = googleId;
                user.updatedAt = new Date();
                await user.save();
            }
        } else {
            // Mock memory Logic (simplified)
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
                    totalTokensUsed: 0
                };
                userStorage.set(uId, user);
            }
        }

        const token = generateToken({ id: user._id || user.id, email: user.email });

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


// ---- New Signup Controller ----
export const signup = async (req, res) => {
    try {
        const { name, email, password, guestId } = req.body;
        const useDatabase = isDatabaseConnected();

        if (!useDatabase) {
            return res.status(500).json({ success: false, error: 'Database not connected. Cannot sign up.' });
        }

        if (!email || !password || !name) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Email already exists' });
        }

        const hashedPassword = await hashPassword(password);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
            plan: 'free',
            totalTokensUsed: 0,
            apiKey: `ask_${crypto.randomBytes(16).toString('hex')}`
        });

        await user.save();
        console.log(`✅ New user created (Email): ${email}`);

        // Migrate guest data
        if (guestId) {
            await Session.updateMany({ guestId }, { userId: user._id.toString() });
            await Chat.updateMany({ guestId }, { userId: user._id.toString() });

            // Merge guest token usage
            const guestUser = await User.findOne({ guestId });
            if (guestUser) {
                user.totalTokensUsed += guestUser.totalTokensUsed || 0;
                await user.save();
            }
        }

        const token = generateToken({ id: user._id, email: user.email });

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                plan: user.plan,
                totalTokensUsed: user.totalTokensUsed
            },
            token
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, error: 'Signup failed' });
    }
};

// ---- New Login Controller ----
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const useDatabase = isDatabaseConnected();

        if (!useDatabase) {
            return res.status(500).json({ success: false, error: 'Database not connected. Cannot login.' });
        }

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid credentials' });
        }

        if (!user.password) {
            return res.status(400).json({ success: false, error: 'Please login with Google' });
        }

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'Invalid credentials' });
        }

        const token = generateToken({ id: user._id, email: user.email });

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                avatarUrl: user.avatarUrl,
                plan: user.plan,
                totalTokensUsed: user.totalTokensUsed
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
};
