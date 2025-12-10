import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyCv9_NKsd8-roI5sf5xex8e0dD-EZsQ_F0",
    authDomain: "askape-cef74.firebaseapp.com",
    projectId: "askape-cef74",
    storageBucket: "askape-cef74.firebasestorage.app",
    messagingSenderId: "745415698584",
    appId: "1:745415698584:web:9a6e0f24048fe7396b08ed",
    measurementId: "G-DPE7FWE2TX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

let analytics;
// Initialize analytics only on client side
if (typeof window !== 'undefined') {
    isSupported().then(yes => {
        if (yes) {
            analytics = getAnalytics(app);
        }
    });
}

export { auth, googleProvider, analytics };
