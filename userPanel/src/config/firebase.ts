import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyChf-IdA1voB5MKgSWHzZbYj4tEYa0c9AM",
    authDomain: "askape-bc0e0.firebaseapp.com",
    projectId: "askape-bc0e0",
    storageBucket: "askape-bc0e0.firebasestorage.app",
    messagingSenderId: "76499360106",
    appId: "1:76499360106:web:2f965dca0accf4e1acad13",
    measurementId: "G-7QYVKD4CQW"
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
