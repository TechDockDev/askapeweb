import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

let razorpay;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
} else {
    console.warn("⚠️ Razorpay keys are missing. Payment features will not work.");
}

if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.warn("⚠️ RAZORPAY_WEBHOOK_SECRET is missing. Webhooks will not be verified.");
}

export default razorpay;
