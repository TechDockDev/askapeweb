'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import api from '../../config/api';

export default function PaymentsPage() {
    const [toast, setToast] = useState({ show: false, message: '' });
    const [plans, setPlans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPlan, setCurrentPlan] = useState('free');
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {

        // Fetch User Plan from Server
        const fetchUserProfile = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const { data } = await api.get('/auth/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (data.success && data.user) {
                    setCurrentPlan(data.user.plan || 'free');
                    const savedUser = localStorage.getItem('user');
                    if (savedUser) {
                        const parsed = JSON.parse(savedUser);
                        parsed.plan = data.user.plan;
                        localStorage.setItem('user', JSON.stringify(parsed));
                    }
                }
            } catch (err) {
                console.error("Failed to sync user profile", err);
            }
        };

        fetchUserProfile();

        // Fetch Plans
        const fetchPlans = async () => {
            try {
                const { data } = await api.get('/payments/plans');
                if (data.success) {
                    setPlans(data.plans);
                }
            } catch (error) {
                console.error('Failed to load plans', error);
                showToast('Failed to load plans');
            } finally {
                setIsLoading(false);
            }
        };

        const fetchHistory = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setHistoryLoading(false);
                return;
            }

            try {
                const { data } = await api.get('/payments/history', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (data.success) {
                    setHistory(data.payments);
                }
            } catch (error) {
                console.error('Failed to load history', error);
            } finally {
                setHistoryLoading(false);
            }
        };

        fetchPlans();
        fetchHistory();
    }, []);

    const showToast = (message: string) => {
        setToast({ show: true, message });
        setTimeout(() => setToast({ show: false, message: '' }), 2500);
    };

    const upgradePlan = async (plan: string) => {
        if (plan === 'enterprise') {
            showToast('Our team will contact you shortly!');
            return;
        }

        try {
            showToast('Initializing subscription...');
            const token = localStorage.getItem('token');
            if (!token) {
                showToast('Please login to upgrade');
                return;
            }

            const { data } = await api.post('/payments/create-subscription', {
                planSlug: plan
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!data.success) {
                throw new Error(data.error || 'Subscription creation failed');
            }

            const options = {
                key: data.key_id,
                subscription_id: data.subscription_id,
                name: "AskApe",
                description: `${plan.toUpperCase()} Plan Subscription`,
                handler: async function (response: any) {
                    try {
                        const verifyRes = await api.post('/payments/verify-subscription', {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_subscription_id: response.razorpay_subscription_id,
                            razorpay_signature: response.razorpay_signature
                        }, {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        if (verifyRes.data.success) {
                            showToast('Subscription successful! Plan upgraded.');
                            setTimeout(() => window.location.reload(), 1500);
                        } else {
                            showToast('Subscription verification failed.');
                        }
                    } catch (err) {
                        showToast('Verification error');
                    }
                },
                theme: {
                    color: "#6366f1"
                }
            };

            const rzp1 = new (window as any).Razorpay(options);
            rzp1.on('payment.failed', function (response: any) {
                showToast(`Payment Failed: ${response.error.description}`);
            });
            rzp1.open();

        } catch (error: any) {
            console.error('Payment Error:', error);
            showToast(error.message || 'Payment initialization failed');
        }
    };

    const addPaymentMethod = () => {
        showToast('Opening payment form...');
    };

    return (
        <div className="!min-h-screen bg-[#F6F6F6] text-black !p-8 duration-300 w-full">
            <div className=" mx-auto">
                <div className="flex items-center gap-4 !mb-8 !pb-6 border-b border-gray-200">
                    <Link href="/" className="!w-10 !h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-700 shadow-sm hover:shadow-md hover:-translate-x-1 transition-all duration-200">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                    </Link>
                    <h1 className="text-3xl font-bold flex-1">Payments & Billing</h1>
                </div>

                {/* <div className="bg-white border-2 border-indigo-500/30 rounded-3xl !p-8 !mb-12 flex flex-col md:flex-row justify-between items-center shadow-lg hover:border-indigo-500 transition-all duration-300 gap-6">
                    <div className="text-center md:text-left">
                        <h2 className="text-xl !mb-2 flex items-center justify-center md:justify-start gap-3 font-semibold">
                            Free Plan
                            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-xs font-bold !px-3 !py-1 rounded-full uppercase tracking-wide">Current</span>
                        </h2>
                        <p className="text-gray-500 text-sm">You're currently on the free plan. Upgrade to unlock more features!</p>
                    </div>
                    <div className="text-right w-full md:w-auto">
                        <div className="w-full md:w-64 !h-2 bg-gray-100 rounded-full overflow-hidden !mb-2 mx-auto md:mx-0">
                            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500" style={{ width: '35%' }}></div>
                        </div>
                        <span className="text-sm text-gray-500">350 / 1,000 API calls used</span>
                    </div>
                </div> */}

                <h2 className="text-xl font-bold !mb-6">Choose Your Plan</h2>
                {isLoading ? (
                    <div className="flex justify-center !p-10">
                        <span className="text-gray-400 animate-pulse">Loading plans...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 !mb-12">
                        {plans.map((plan) => (
                            <div key={plan._id} className={`relative bg-white border-2 ${plan.slug === 'pro' ? 'border-[#DFFF00] shadow-[0_0_40px_rgba(99,102,241,0.15)]' : 'border-gray-200'} ${plan.slug === currentPlan ? 'border-green-500' : ''} rounded-3xl !p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-[#DFFF00]`}>
                                {plan.slug === 'pro' && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-lime-300 to-[#DFFF00] text-white !px-4 !py-1.5 rounded-full text-xs font-bold shadow-lg shadow-indigo-500/30 uppercase tracking-wide">
                                        Most Popular
                                    </div>
                                )}
                                <h3 className="text-xl font-bold !mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 !mb-6">
                                    <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00C950] to-[#00C950]">${plan.price}</span>
                                    <span className="text-gray-800  text-sm">/{plan.period || 'month'}</span>
                                </div>
                                <ul className="space-y-3 !mb-8">
                                    {plan.features && plan.features.map((feature: string, idx: number) => (
                                        <li key={idx} className="flex items-center gap-3 text-lg text-black">
                                            <svg className="!w-5 !h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                    {plan.accessLimits && (
                                        <>
                                            <li className="flex items-center gap-3 text-lg text-black">
                                                <svg className="!w-5 !h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                </svg>
                                                {plan.accessLimits.apiCalls === -1 || plan.accessLimits.apiCalls === 0 ? 'Unlimited' : plan.accessLimits.apiCalls.toLocaleString()} API calls
                                            </li>
                                            <li className="flex items-center gap-3 text-lg text-black">
                                                <svg className="!w-5 !h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                </svg>
                                                {plan.accessLimits.modelsAllowed.length > 5 ? 'All AI models' : `${plan.accessLimits.modelsAllowed.length} AI models`}
                                            </li>
                                        </>
                                    )}
                                </ul>

                                {plan.slug === currentPlan ? (
                                    <button className="w-full !py-4 rounded-xl font-semibold bg-[#f0ff90] text-black cursor-default border-amber-200" disabled>Current Plan</button>
                                ) : plan.price > 0 ? (
                                    <button className="w-full !py-4 rounded-xl font-semibold text-black bg-gradient-to-r from-lime-300 to-[#DFFF00] shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all duration-300" onClick={() => upgradePlan(plan.slug)}>
                                        Upgrade to {plan.name}
                                    </button>
                                ) : (
                                    <button className="w-full !py-4 rounded-xl font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-all" onClick={() => showToast('This is a free plan')}>
                                        Start Free
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* <h2 className="text-xl font-bold !mb-6">Payment Methods</h2>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden !mb-12 shadow-sm hover:shadow-md transition-all">
                    <div className="!p-6 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="font-semibold">Your Cards</h3>
                        <button className="!px-4 !py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-sm text-gray-700 flex items-center gap-2 transition-colors" onClick={addPaymentMethod}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                            Add Card
                        </button>
                    </div>
                    <div className="!p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                        <div className="!w-12 !h-8 bg-gradient-to-br from-blue-900 to-blue-600 rounded-md flex items-center justify-center text-white text-[10px] font-bold shadow-sm">VISA</div>
                        <div className="flex-1">
                            <div className="font-medium text-sm mb-1">•••• •••• •••• 4242</div>
                            <div className="text-xs text-gray-500">Expires 12/2025</div>
                        </div>
                        <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 text-green-500 rounded text-xs font-medium">Default</span>
                        <button className="!p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100" title="Delete">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div> */}

                <h2 className="text-xl font-bold !mb-6">Billing History</h2>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="!px-6 !py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="!px-6 !py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                                    <th className="!px-6 !py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="!px-6 !py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="!px-6 !py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subscription ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {historyLoading ? (
                                    <tr>
                                        <td colSpan={5} className="!px-6 !py-8 text-center text-gray-400">Loading history...</td>
                                    </tr>
                                ) : history.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="!px-6 !py-8 text-center text-gray-400">No payment history found</td>
                                    </tr>
                                ) : (
                                    history.map((payment: any) => (
                                        <tr key={payment._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="!px-6 !py-4 whitespace-nowrap text-sm text-gray-700">
                                                {new Date(payment.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="!px-6 !py-4 text-sm text-gray-700">
                                                {payment.planId?.name || 'Unknown Plan'}
                                            </td>
                                            <td className="!px-6 !py-4 text-sm font-medium text-gray-900">
                                                {payment.currency === 'INR' ? '₹' : '$'}{payment.amount}
                                            </td>
                                            <td className="!px-6 !py-4">
                                                <span className={`!px-2.5 !py-1 rounded-full text-xs font-medium border ${payment.status === 'completed'
                                                    ? 'bg-green-100 text-green-700 border-green-200'
                                                    : payment.status === 'failed'
                                                        ? 'bg-red-100 text-red-700 border-red-200'
                                                        : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                    }`}>
                                                    {payment.status ? (payment.status.charAt(0).toUpperCase() + payment.status.slice(1)) : 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="!px-6 !py-4 font-mono text-xs text-gray-500">
                                                {payment.razorpaySubscriptionId || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-white border border-gray-200 px-6 py-3 rounded-xl flex items-center gap-3 shadow-xl z-50 transition-all duration-300 ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span className="text-sm font-medium text-gray-700">{toast.message}</span>
                </div>
                <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
            </div>
        </div>
    );
}
