import User from '../models/User.js';
import Plan from '../models/Plan.js';
import Payment from '../models/Payment.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Admin login attempt:', email);

        // For simplicity/demo ensuring we can login even without a seeded admin
        // In prod, check DB. 
        // TEMP: Allow a hardcoded admin for bootstrap if user doesn't exist? 
        // Better: Check regular user login but verify role='admin'

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'Admin not found' });

        // Basic password check (assuming using same hashing as users)
        // If google auth is used, they might need a specific admin password set separately
        // For now, let's assume standard auth flow
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

        res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalPlans = await Plan.countDocuments();

        // Calculate monthly growth (users created in the last 6 months)
        const months = 6;
        const monthlyGrowth = [];

        for (let i = 0; i < months; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const count = await User.countDocuments({
                createdAt: { $gte: firstDay, $lte: lastDay }
            });

            monthlyGrowth.push({
                name: firstDay.toLocaleString('default', { month: 'short' }),
                users: count
            });
        }

        res.json({
            totalUsers,
            totalPlans,
            monthlyGrowth: monthlyGrowth.reverse()
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createPlan = async (req, res) => {
    try {
        const newPlan = new Plan(req.body);
        await newPlan.save();
        res.status(201).json(newPlan);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create plan', error: err.message });
    }
};

export const getPlans = async (req, res) => {
    try {
        const plans = await Plan.find();
        res.json(plans);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch plans' });
    }
};

export const getUsers = async (req, res) => {
    try {
        // Fetch users with their plan details (if we referenced Plan in User, but currently User has basic plan string)
        // We can just return users list
        const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(100);
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};

export const getUserDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const payments = await Payment.find({ userId: id }).sort({ createdAt: -1 });

        res.json({ user, payments });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch user details' });
    }
};
