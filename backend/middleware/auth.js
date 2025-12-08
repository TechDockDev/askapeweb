import User from '../models/User.js';

const API_KEY = process.env.API_KEY || 'askape-dev-key-2024';
let userStorage = new Map(); // Needs to be shared or injected if we want to support in-memory auth properly in middleware

export const setAuthUserStorage = (storage) => {
    userStorage = storage;
};

let useDatabase = false;
export const setAuthUseDatabase = (value) => {
    useDatabase = value;
};

export const authenticateAPI = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
        return res.status(401).json({ success: false, error: 'API key required' });
    }

    if (apiKey !== API_KEY) {
        return res.status(403).json({ success: false, error: 'Invalid API key' });
    }

    next();
};

export const authenticateUser = async (req, res, next) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    let user;
    if (useDatabase) {
        user = await User.findOne({ tokens: token });
    } else {
        user = Array.from(userStorage.values()).find(u => u.tokens?.includes(token));
    }

    if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    req.user = user;
    next();
};
