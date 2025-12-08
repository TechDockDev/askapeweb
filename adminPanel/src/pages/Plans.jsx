import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Plans() {
    const [plans, setPlans] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newPlan, setNewPlan] = useState({
        name: '',
        slug: '',
        price: 0,
        period: 'monthly',
        features: '', // comma separated for simple input
        apiCalls: -1,
        maxTokens: 1000
    });

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('http://localhost:3001/api/admin/plans', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPlans(res.data);
        } catch (err) {
            console.error('Failed to fetch plans');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('adminToken');
            const payload = {
                ...newPlan,
                features: newPlan.features.split(',').map(f => f.trim()),
                accessLimits: {
                    apiCalls: newPlan.apiCalls,
                    maxTokens: newPlan.maxTokens,
                    modelsAllowed: [] // simple default
                }
            };

            await axios.post('http://localhost:3001/api/admin/plans', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            fetchPlans();
            // Reset form
            setNewPlan({ name: '', slug: '', price: 0, period: 'monthly', features: '', apiCalls: -1, maxTokens: 1000 });
        } catch (err) {
            alert('Failed to create plan');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800">Membership Plans</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                    + Create New Template
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div key={plan._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                        <div className="text-3xl font-bold text-indigo-600 mb-4">
                            ${plan.price}<span className="text-lg text-gray-400 font-normal">/{plan.period === 'monthly' ? 'mo' : 'yr'}</span>
                        </div>

                        <div className="flex-1">
                            <p className="text-sm text-gray-500 font-semibold uppercase mb-3">Features</p>
                            <ul className="space-y-2 mb-6">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center text-gray-600 text-sm">
                                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 space-y-1">
                                <div className="flex justify-between">
                                    <span>API Calls:</span>
                                    <span className="font-medium">{plan.accessLimits?.apiCalls === -1 ? 'Unlimited' : plan.accessLimits?.apiCalls}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Max Tokens:</span>
                                    <span className="font-medium">{plan.accessLimits?.maxTokens}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-lg">
                        <h3 className="text-xl font-bold mb-4">Create Membership Template</h3>
                        <form onSubmit={handleCreate}>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Plan Name</label>
                                    <input className="w-full border rounded p-2" value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} required placeholder="e.g. Pro Plus" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Slug (ID)</label>
                                    <input className="w-full border rounded p-2" value={newPlan.slug} onChange={e => setNewPlan({ ...newPlan, slug: e.target.value.toLowerCase() })} required placeholder="e.g. pro_plus" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Price ($)</label>
                                    <input type="number" className="w-full border rounded p-2" value={newPlan.price} onChange={e => setNewPlan({ ...newPlan, price: Number(e.target.value) })} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Billing Period</label>
                                    <select className="w-full border rounded p-2" value={newPlan.period} onChange={e => setNewPlan({ ...newPlan, period: e.target.value })}>
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Features (comma separated)</label>
                                <input className="w-full border rounded p-2" value={newPlan.features} onChange={e => setNewPlan({ ...newPlan, features: e.target.value })} placeholder="Feature 1, Feature 2..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium mb-1">API Calls Limit</label>
                                    <input type="number" className="w-full border rounded p-2" value={newPlan.apiCalls} onChange={e => setNewPlan({ ...newPlan, apiCalls: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Max Tokens Limit</label>
                                    <input type="number" className="w-full border rounded p-2" value={newPlan.maxTokens} onChange={e => setNewPlan({ ...newPlan, maxTokens: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Create Plan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
