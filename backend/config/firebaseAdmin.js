import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// Load service account from the file in the project root
const serviceAccount = require('../../askape-cef74-firebase-adminsdk-fbsvc-0bd6108088.json');

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('🔥 Firebase Admin Initialized with JSON file');
    } catch (error) {
        console.error('❌ Firebase Admin Initialization Error:', error.message);
    }
}

export default admin;
