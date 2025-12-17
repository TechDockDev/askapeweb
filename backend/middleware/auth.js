import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.API_KEY || 'askape-dev-key-2024';
let userStorage = new Map(); // Needs to be shared or injected if we want to support in-memory auth properly in middleware

export const setAuthUserStorage = (storage) => {
    userStorage = storage;
};

let useDatabase = true;
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
    console.log("Token--->", token);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    try {
        console.log("Secret---->", process.env.JWT_SECRET);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        console.log("Decoded--->", decoded);
        let user;


        if (useDatabase) {
            user = await User.findById(decoded.id);
        } else {
            user = userStorage.get(decoded.id);
        }

        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
};
