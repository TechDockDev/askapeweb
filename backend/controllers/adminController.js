import User from '../models/User.js';
import Plan from '../models/Plan.js';
import Payment from '../models/Payment.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import razorpay from '../config/razorpay.js';

export const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Admin login attempt:', email);

        // For simplicity/demo ensuring we can login even without a seeded admin
        // In prod, check DB. 
        // TEMP: Allow a hardcoded admin for bootstrap if user doesn't exist? 
        // Better: Check regular user login but verify role='admin'

        const user = await User.findOne({ email }).select('+password');
        if (!user) return res.status(404).json({ message: 'Admin not found' });

        // Basic password check (assuming using same hashing as users)
        // If google auth is used, they might need a specific admin password set separately
        // For now, let's assume standard auth flow
        if (!user.password) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

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
        const totalUsers = await User.countDocuments({ isGuest: false });
        const totalGuests = await User.countDocuments({ isGuest: true });
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
                createdAt: { $gte: firstDay, $lte: lastDay },
                isGuest: false
            });

            monthlyGrowth.push({
                name: firstDay.toLocaleString('default', { month: 'short' }),
                users: count
            });
        }

        const totalRevenueResult = await Payment.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        // Assuming amount is stored in the smallest currency unit (e.g. cents/paise)
        // Adjust if needed based on how you store data.
        // For now, let's assume it's stored as the display value OR handled by frontend.
        // Actually, safer to return as is.
        const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

        res.json({
            totalUsers,
            totalGuests,
            totalPlans,
            totalRevenue,
            monthlyGrowth: monthlyGrowth.reverse()
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createPlan = async (req, res) => {
    try {
        let { razorpayPlanId, slug, name, price, period, description } = req.body;

        const existingPlan = await Plan.findOne({ slug });
        if (existingPlan) {
            return res.status(400).json({ message: 'Plan with this slug already exists' });
        }

        // Auto-create in Razorpay if ID not provided AND price > 0
        if (price > 0 && !razorpayPlanId && razorpay) {
            try {
                const rzpPlan = await razorpay.plans.create({
                    period: period === 'yearly' ? 'yearly' : 'monthly',
                    interval: 1,
                    item: {
                        name: name,
                        amount: price * 100, // Amount in paise
                        currency: "INR",
                        description: description || `${name} Subscription`
                    }
                });
                razorpayPlanId = rzpPlan.id;
                console.log(`✅ Created Razorpay Plan: ${razorpayPlanId}`);
            } catch (rzpError) {
                console.error("Razorpay Plan Creation Failed:", rzpError);
                return res.status(500).json({ message: 'Failed to create plan in Razorpay', error: rzpError.message });
            }
        }

        // Final check if we still don't have an ID for PAID plans
        if (price > 0 && !razorpayPlanId) {
            return res.status(400).json({ message: 'razorpayPlanId is required for paid plans' });
        }

        const newPlan = new Plan({ ...req.body, razorpayPlanId });
        await newPlan.save();
        res.status(201).json(newPlan);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create plan', error: err.message });
    }
};

export const updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedPlan = await Plan.findByIdAndUpdate(id, req.body, { new: true });
        res.json(updatedPlan);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update plan' });
    }
};

export const deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
        await Plan.findByIdAndDelete(id);
        res.json({ message: 'Plan deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete plan' });
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
        const { search, plan, page = 1, limit = 10 } = req.query;
        let query = { isGuest: false };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (plan && plan !== 'all') {
            query.plan = plan;
        }

        const count = await User.countDocuments(query);
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        res.json({
            users,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page),
            totalUsers: count
        });
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
