'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './payments.css';

export default function PaymentsPage() {
    const [theme, setTheme] = useState('light');
    const [toast, setToast] = useState({ show: false, message: '' });

    useEffect(() => {
        // Load theme on mount
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const showToast = (message: string) => {
        setToast({ show: true, message });
        setTimeout(() => setToast({ show: false, message: '' }), 2500);
    };

    const upgradePlan = (plan: string) => {
        if (plan === 'enterprise') {
            showToast('Our team will contact you shortly!');
        } else {
            showToast('Redirecting to checkout...');
        }
    };

    const addPaymentMethod = () => {
        showToast('Opening payment form...');
    };

    return (
        <div className="payments-container">
            <div className="header">
                <Link href="/" className="back-btn">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </Link>
                <h1 className="page-title">Payments & Billing</h1>
            </div>

            <div className="current-plan-banner">
                <div className="plan-info">
                    <h2>
                        Free Plan
                        <span className="plan-badge">Current</span>
                    </h2>
                    <p>You're currently on the free plan. Upgrade to unlock more features!</p>
                </div>
                <div className="plan-usage">
                    <div className="usage-bar">
                        <div className="usage-fill" style={{ width: '35%' }}></div>
                    </div>
                    <span className="usage-text">350 / 1,000 API calls used</span>
                </div>
            </div>

            <h2 className="section-title">Choose Your Plan</h2>
            <div className="plans-grid">
                <div className="plan-card current">
                    <h3 className="plan-name">Free</h3>
                    <div className="plan-price">
                        <span className="price-amount">$0</span>
                        <span className="price-period">/month</span>
                    </div>
                    <ul className="plan-features">
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            1,000 API calls/month
                        </li>
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            3 AI models
                        </li>
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Basic chat history
                        </li>
                        <li className="disabled">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                            Priority support
                        </li>
                    </ul>
                    <button className="plan-btn current">Current Plan</button>
                </div>

                <div className="plan-card popular">
                    <div className="popular-badge">Most Popular</div>
                    <h3 className="plan-name">Pro</h3>
                    <div className="plan-price">
                        <span className="price-amount">$19</span>
                        <span className="price-period">/month</span>
                    </div>
                    <ul className="plan-features">
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            50,000 API calls/month
                        </li>
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            All AI models
                        </li>
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Unlimited chat history
                        </li>
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Priority support
                        </li>
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Custom API keys
                        </li>
                    </ul>
                    <button className="plan-btn primary" onClick={() => upgradePlan('pro')}>
                        Upgrade to Pro
                    </button>
                </div>

                <div className="plan-card">
                    <h3 className="plan-name">Enterprise</h3>
                    <div className="plan-price">
                        <span className="price-amount">$99</span>
                        <span className="price-period">/month</span>
                    </div>
                    <ul className="plan-features">
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Unlimited API calls
                        </li>
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            All AI models + Custom
                        </li>
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            SSO & Team management
                        </li>
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            24/7 Dedicated support
                        </li>
                        <li>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            SLA guarantee
                        </li>
                    </ul>
                    <button className="plan-btn outline" onClick={() => upgradePlan('enterprise')}>
                        Contact Sales
                    </button>
                </div>
            </div>

            <h2 className="section-title">Payment Methods</h2>
            <div className="billing-card">
                <div className="billing-header">
                    <h3>Your Cards</h3>
                    <button className="add-card-btn" onClick={addPaymentMethod}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        Add Card
                    </button>
                </div>
                <div className="payment-method">
                    <div className="card-icon">VISA</div>
                    <div className="card-details">
                        <div className="card-number">•••• •••• •••• 4242</div>
                        <div className="card-expiry">Expires 12/2025</div>
                    </div>
                    <span className="default-badge">Default</span>
                    <div className="card-actions">
                        <button title="Delete">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <h2 className="section-title">Billing History</h2>
            <div className="billing-card">
                <table className="invoices-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Dec 1, 2024</td>
                            <td>Pro Plan - Monthly</td>
                            <td>$19.00</td>
                            <td><span className="status-badge paid">Paid</span></td>
                            <td>
                                <button className="download-btn">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                    </svg>
                                    PDF
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>Nov 1, 2024</td>
                            <td>Pro Plan - Monthly</td>
                            <td>$19.00</td>
                            <td><span className="status-badge paid">Paid</span></td>
                            <td>
                                <button className="download-btn">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                    </svg>
                                    PDF
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className={`toast ${toast.show ? 'show' : ''}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>{toast.message}</span>
            </div>
        </div>
    );
}
