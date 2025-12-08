'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import './login.css';

export default function LoginPage() {
    const router = useRouter();
    const [theme, setTheme] = useState('light');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);

        // Check if already logged in
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (user && token) {
            router.push('/');
        }
    }, [router]);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const signInWithGoogle = () => {
        setLoading(true);
        try {
            (window as any).google.accounts.id.initialize({
                client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
                callback: handleGoogleCallback,
                auto_select: false,
            });
            (window as any).google.accounts.id.prompt((notification: any) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    setLoading(false);
                }
            });
        } catch (e) {
            setLoading(false);
            setError('Google Sign-In is not available. Please try again.');
        }
    };

    const handleGoogleCallback = async (response: any) => {
        try {
            const result = await fetch('/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: response.credential }),
            });

            const data = await result.json();

            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('token', data.token);
                setSuccess('Welcome! Redirecting...');
                setTimeout(() => router.push('/'), 1000);
            } else {
                setLoading(false);
                setError(data.error || 'Sign in failed. Please try again.');
            }
        } catch (error) {
            setLoading(false);
            setError('Connection error. Please try again.');
        }
    };

    return (
        <>
            <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />

            <div className="theme-toggle">
                <button className="theme-btn" onClick={toggleTheme} title="Toggle theme">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {theme === 'dark' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        )}
                    </svg>
                </button>
            </div>

            <div className="auth-container">
                <a href="/" className="back-link">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Chat
                </a>

                <div className="auth-card">
                    <div className="logo">
                        <div className="logo-icon">
                            <svg viewBox="0 0 24 24" fill="white" className="sparkle-icon">
                                <path d="M12 1L13.5 8.5L21 10L13.5 11.5L12 19L10.5 11.5L3 10L10.5 8.5L12 1Z" />
                                <path d="M19 2L19.75 4.25L22 5L19.75 5.75L19 8L18.25 5.75L16 5L18.25 4.25L19 2Z" opacity="0.7" />
                                <path d="M5 16L5.5 17.5L7 18L5.5 18.5L5 20L4.5 18.5L3 18L4.5 17.5L5 16Z" opacity="0.7" />
                            </svg>
                        </div>
                        <span className="logo-text">AskApe</span>
                    </div>

                    <h1 className="auth-title">Welcome Back</h1>
                    <p className="auth-subtitle">
                        Sign in with your Google account to continue chatting with multiple AI models
                    </p>

                    {error && <div className="error-msg show">{error}</div>}
                    {success && <div className="success-msg show">{success}</div>}

                    <button className={`google-btn ${loading ? 'loading' : ''}`} onClick={signInWithGoogle}>
                        <svg viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {loading ? 'Signing in...' : 'Continue with Google'}
                    </button>

                    <div className="divider">What you get</div>

                    <ul className="features-list">
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Query multiple AI models simultaneously
                        </li>
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Compare responses from different LLMs
                        </li>
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Save and sync your chat history
                        </li>
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Access from any device
                        </li>
                    </ul>

                    <p className="terms-text">
                        By signing in, you agree to our<br />
                        <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                    </p>
                </div>
            </div>
        </>
    );
}
