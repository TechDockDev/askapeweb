import crypto from 'crypto';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Plan from '../models/Plan.js';
import razorpay from '../config/razorpay.js';

// Removed local initialization


export const createSubscription = async (req, res) => {
    console.log("Hiii I am there!");
    try {
        if (!razorpay) {
            return res.status(503).json({ success: false, error: 'Payment service unavailable (Configuration missing)' });
        }
        const { planSlug } = req.body;
        const userId = req.user._id;

        const plan = await Plan.findOne({ slug: planSlug });
        if (!plan) {
            return res.status(404).json({ success: false, error: 'Plan not found' });
        }

        if (!plan.razorpayPlanId) {
            console.error(`Plan ${planSlug} is missing razorpayPlanId`);
            return res.status(500).json({ success: false, error: 'Subscription not configured for this plan' });
        }

        const subscriptionOptions = {
            plan_id: plan.razorpayPlanId,
            total_count: 12, // Example: 1 year of monthly subscription
            quantity: 1,
            customer_notify: 1,
            notes: {
                userId: userId.toString(),
                planSlug: planSlug
            }
        };

        const subscription = await razorpay.subscriptions.create(subscriptionOptions);

        // Create a pending payment record (or subscription record)
        // We reuse Payment model but store subscription ID
        const payment = new Payment({
            userId,
            planId: plan._id,
            amount: plan.price,
            currency: 'USD', // or get from plan
            razorpaySubscriptionId: subscription.id,
            status: 'pending'
        });
        await payment.save();

        res.json({
            success: true,
            subscription_id: subscription.id,
            key_id: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('Razorpay Create Subscription Error:', error);
        res.status(500).json({ success: false, error: 'Failed to create subscription' });
    }
};

export const verifySubscription = async (req, res) => {
    try {
        const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = req.body;
        const userId = req.user._id;

        console.log("Body---->", req.body);

        const body = razorpay_payment_id + "|" + razorpay_subscription_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Payment successful

            // 1. Update Payment Record
            const payment = await Payment.findOne({ razorpaySubscriptionId: razorpay_subscription_id });
            if (payment) {
                payment.status = 'completed';
                payment.razorpayPaymentId = razorpay_payment_id;
                payment.razorpaySignature = razorpay_signature;
                await payment.save();

                // 2. Update User Plan
                if (payment.planId) {
                    const plan = await Plan.findById(payment.planId);
                    if (plan) {
                        await User.findByIdAndUpdate(userId, {
                            plan: plan.slug,
                            tokenBalance: plan.accessLimits.maxTokens || 2000 // Reset Balance
                        });
                    }
                }

                res.json({ success: true, message: 'Subscription verified and plan updated' });
            } else {
                res.status(404).json({ success: false, error: 'Subscription record not found' });
            }
        } else {
            // Signature verification failed
            const payment = await Payment.findOne({ razorpaySubscriptionId: razorpay_subscription_id });
            if (payment) {
                payment.status = 'failed';
                await payment.save();
            }
            res.status(400).json({ success: false, error: 'Invalid signature' });
        }

    } catch (error) {
        console.error('Razorpay Verification Error:', error);
        res.status(500).json({ success: false, error: 'Subscription verification failed' });
    }
};

export const getActivePlans = async (req, res) => {
    try {
        const plans = await Plan.find({ isActive: true }).select('-razorpayPlanId'); // Don't expose internal ID if not needed, or do if needed for client logic (mostly not needed if backend handles creation)
        // actually we don't need razorpayPlanId on client if backend creates subscription.
        res.json({ success: true, plans });
    } catch (error) {
        console.error('Fetch Plans Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch plans' });
    }
};

export const getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const payments = await Payment.find({ userId: userId })
            .sort({ createdAt: -1 })
            .populate('planId', 'name slug price period');

        res.json({ success: true, payments });
    } catch (error) {
        console.error('Fetch Payment History Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch payment history' });
    }
};

export const handleWebhook = async (req, res) => {
    console.log("Hey Webhook-------->");
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // Verify Signature
        if (secret) {
            const shasum = crypto.createHmac('sha256', secret);
            shasum.update(req.rawBody);
            const digest = shasum.digest('hex');

            if (digest !== req.headers['x-razorpay-signature']) {
                console.error('Invalid Webhook Signature');
                return res.status(400).json({ success: false, error: 'Invalid signature' });
            }
        } else {
            console.warn("Skipping signature verification: RAZORPAY_WEBHOOK_SECRET not set");
        }

        const event = req.body;
        console.log('Webhook Received:', event.event);

        if (event.event === 'subscription.charged') {
            const subscriptionId = event.payload.subscription.entity.id;
            const paymentId = event.payload.payment.entity.id;

            // Find the payment record by subscription ID
            let payment = await Payment.findOne({ razorpaySubscriptionId: subscriptionId });

            if (payment) {
                payment.status = 'completed';
                payment.razorpayPaymentId = paymentId;
                payment.lastPaymentDate = new Date();
                await payment.save();

                // Update User Plan
                if (payment.planId) {
                    const plan = await Plan.findById(payment.planId);
                    if (plan) {
                        await User.findByIdAndUpdate(payment.userId, {
                            plan: plan.slug,
                            tokenBalance: plan.accessLimits.maxTokens || 2000 // Reset Balance
                        });
                        console.log(`Plan updated for user ${payment.userId} to ${plan.slug}`);
                    }
                }
            } else {
                console.warn(`Payment record not found for subscription ${subscriptionId}`);
            }
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ success: false, error: 'Webhook processing failed' });
    }
};
