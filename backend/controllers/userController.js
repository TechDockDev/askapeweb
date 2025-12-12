import User from '../models/User.js';
import { isDatabaseConnected } from '../config/db.js';
import { userStorage } from '../config/memoryStorage.js';
import { AVAILABLE_MODELS } from '../config/constants.js';

export const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json({ success: true, users: [] });
        }

        const useDatabase = isDatabaseConnected();
        let users = [];

        if (useDatabase) {
            users = await User.find({
                $or: [
                    { name: { $regex: q, $options: 'i' } },
                    { email: { $regex: q, $options: 'i' } }
                ],
                isGuest: false // Don't allow searching/adding guest users
            })
                .select('name email avatar _id')
                .limit(10);
        } else {
            // Mock search in memory if needed (mostly for testing)
            users = Array.from(userStorage.values())
                .filter(u => !u.isGuest && (u.name?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase())))
                .map(u => ({ name: u.name, email: u.email, avatar: u.avatar, _id: u.id || u._id }));
        }

        res.json({ success: true, users });
    } catch (error) {
        console.error('Search user error:', error);
        res.status(500).json({ success: false, error: 'Failed to search users' });
    }
};

export const getUserUsage = async (req, res) => {
    try {
        const { userId, guestId } = req.query;
        const useDatabase = isDatabaseConnected();
        let totalTokensUsed = 0;

        if (useDatabase) {
            const query = userId ? { _id: userId } : guestId ? { guestId } : null;
            if (query) {
                const user = await User.findOne(query);
                totalTokensUsed = user?.totalTokensUsed || 0;
            }
        } else {
            const user = userStorage.get(userId || guestId);
            totalTokensUsed = user?.totalTokensUsed || 0;
        }

        res.json({
            success: true,
            totalTokensUsed
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getModels = (req, res) => {
    res.json({
        success: true,
        data: { models: AVAILABLE_MODELS, count: AVAILABLE_MODELS.length }
    });
};
