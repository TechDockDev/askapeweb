import User from '../models/User.js';
import { isDatabaseConnected } from '../config/db.js';
import { userStorage } from '../config/memoryStorage.js';
import { AVAILABLE_MODELS } from '../config/constants.js';

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
