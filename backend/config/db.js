import mongoose from 'mongoose';

let useDatabase = false;

export const connectDB = async (MONGODB_URI) => {
    if (!mongoose) {
        console.log('❌ Mongoose not installed! Run: npm install mongoose');
        console.log('📦 Falling back to in-memory storage (data will be lost on restart)');
        return false;
    }

    console.log('🔄 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI}`);

    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log('✅ Connected to MongoDB successfully!');
        useDatabase = true;

        // Index optimization logic could go here or be called separately
        return true;
    } catch (err) {
        console.log('');
        console.log('❌ MongoDB connection failed!');
        console.log(`   Error: ${err.message}`);
        console.log('');
        console.log('💡 To fix this:');
        console.log('   1. Install MongoDB locally: https://www.mongodb.com/try/download/community');
        console.log('   2. Or use MongoDB Atlas (cloud): https://www.mongodb.com/atlas');
        console.log('   3. Update MONGODB_URI in .env file');
        console.log('');
        console.log('⚠️ Using in-memory storage as fallback (data will NOT persist!)');
        return false;
    }
};

export const isDatabaseConnected = () => useDatabase;
