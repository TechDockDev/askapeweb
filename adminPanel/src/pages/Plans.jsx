import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

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

    const [editId, setEditId] = useState(null);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get(`${API_BASE_URL}/admin/plans`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPlans(res.data);
        } catch (err) {
            console.error('Failed to fetch plans');
        }
    };

    const resetForm = () => {
        setNewPlan({ name: '', slug: '', price: 0, period: 'monthly', features: '', apiCalls: -1, maxTokens: 1000 });
        setEditId(null);
    };

    const handleEdit = (plan) => {
        setNewPlan({
            name: plan.name,
            slug: plan.slug,
            price: plan.price,
            period: plan.period,
            features: typeof plan.features === 'string' ? plan.features : plan.features.join(', '),
            apiCalls: plan.accessLimits?.apiCalls || -1,
            maxTokens: plan.accessLimits?.maxTokens || 0
        });
        setEditId(plan._id);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('adminToken');
            const payload = {
                ...newPlan,
                features: newPlan.features.split(',').map(f => f.trim()),
                accessLimits: {
                    apiCalls: newPlan.apiCalls,
                    maxTokens: newPlan.maxTokens,
                    modelsAllowed: []
                }
            };

            if (editId) {
                // Update existing plan
                await axios.put(`${API_BASE_URL}/admin/plans/${editId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setShowModal(false);
            fetchPlans();
            resetForm();
        } catch (err) {
            alert(editId ? 'Failed to update plan' : 'Failed to create plan');
        }
    };

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const handleDelete = (id) => {
        setDeleteId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`${API_BASE_URL}/admin/plans/${deleteId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowDeleteModal(false);
            setDeleteId(null);
            fetchPlans();
        } catch (err) {
            alert('Failed to delete plan');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800">Membership Plans</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-brand text-black px-4 py-2 rounded-lg hover:bg-brand/80 transition font-medium"
                >
                    + Create New Template
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div key={plan._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col group relative transition-all hover:shadow-lg">
                        <div className="absolute top-0 right-0 p-4 transition-opacity flex gap-2">
                            <button
                                onClick={() => handleEdit(plan)}
                                className="p-2 bg-white rounded-full shadow-md text-gray-500 hover:text-brand hover:scale-110 transition-all"
                                title="Edit Plan"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                            <button
                                onClick={() => handleDelete(plan._id)}
                                className="p-2 bg-white rounded-full shadow-md text-gray-500 hover:text-red-500 hover:scale-110 transition-all"
                                title="Delete Plan"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                        <div className="text-3xl font-bold text-black mb-4">
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-brand"></div>
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-bold text-gray-900">{editId ? 'Edit Membership Template' : 'Create Membership Template'}</h3>
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-black transition">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Plan Name</label>
                                    <input
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                                        value={newPlan.name}
                                        onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                                        required
                                        placeholder="e.g. Pro Plus"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Slug (ID)</label>
                                    <input
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                                        value={newPlan.slug}
                                        onChange={e => setNewPlan({ ...newPlan, slug: e.target.value.toLowerCase() })}
                                        required
                                        placeholder="e.g. pro_plus"
                                        disabled={!!editId} // Disable slug editing
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Price ($)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                                        value={newPlan.price}
                                        onChange={e => setNewPlan({ ...newPlan, price: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Billing Period</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all appearance-none"
                                            value={newPlan.period}
                                            onChange={e => setNewPlan({ ...newPlan, period: e.target.value })}
                                        >
                                            <option value="monthly">Monthly</option>
                                            <option value="yearly">Yearly</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Features</label>
                                <textarea
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all resize-none h-16"
                                    value={newPlan.features}
                                    onChange={e => setNewPlan({ ...newPlan, features: e.target.value })}
                                    placeholder="Feature 1, Feature 2 (comma separated)..."
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">API Calls Limit</label>
                                    <input
                                        type="number"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                                        value={newPlan.apiCalls}
                                        onChange={e => setNewPlan({ ...newPlan, apiCalls: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Max Tokens Limit</label>
                                    <input
                                        type="number"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                                        value={newPlan.maxTokens}
                                        onChange={e => setNewPlan({ ...newPlan, maxTokens: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-brand text-black rounded-lg hover:bg-brand/90 transition font-bold shadow-md hover:shadow-lg"
                                >
                                    {editId ? 'Update Plan' : 'Create Plan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm relative overflow-hidden transform transition-all scale-100">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg leading-6 font-bold text-gray-900 mb-2">Delete Plan</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to delete this membership plan? This action cannot be undone.
                            </p>
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-bold shadow-md hover:shadow-lg"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
