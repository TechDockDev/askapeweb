import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true }, // e.g., 'free', 'pro'
    razorpayPlanId: { type: String }, // e.g., 'plan_G0tF6...'
    price: { type: Number, required: true },
    period: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    features: [String],
    accessLimits: {
        apiCalls: { type: Number, default: 0 }, // 0 = unlimited? or -1? Let's say -1 is unlimited
        modelsAllowed: [String], // List of model IDs
        maxTokens: { type: Number, default: 1000 }
    },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Plan = mongoose.model('Plan', planSchema);
export default Plan;
