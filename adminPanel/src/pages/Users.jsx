import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function Users() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('all');
    const [plans, setPlans] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchPlans();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setPage(1); // Reset to page 1 on search/filter change
            fetchUsers(1);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [search, selectedPlan]);

    useEffect(() => {
        fetchUsers(page);
    }, [page]);

    const fetchPlans = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/admin/plans`);
            setPlans(res.data);
        } catch (err) {
            console.error('Failed to fetch plans');
        }
    };

    const fetchUsers = async (pageNum) => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get(`${API_BASE_URL}/admin/users`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    search: search,
                    plan: selectedPlan,
                    page: pageNum || page,
                    limit: 10
                }
            });
            setUsers(res.data.users);
            setTotalPages(res.data.totalPages);
        } catch (err) {
            console.error('Failed to fetch users');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800">Users Management</h2>

                <div className="flex gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent w-64"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <select
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white"
                        value={selectedPlan}
                        onChange={(e) => setSelectedPlan(e.target.value)}
                    >
                        <option value="all">All Plans</option>
                        {plans.map(plan => (
                            <option key={plan._id} value={plan.slug}>{plan.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex gap-6">
                {/* User List */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b">
                                <tr>
                                    <th className="text-left p-4 text-sm font-semibold text-gray-600">Name</th>
                                    <th className="text-left p-4 text-sm font-semibold text-gray-600">Email</th>
                                    <th className="text-left p-4 text-sm font-semibold text-gray-600">Plan</th>
                                    <th className="text-left p-4 text-sm font-semibold text-gray-600">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user._id} className="border-b hover:bg-gray-50">
                                        <td className="p-4 flex items-center gap-3 text-black">
                                            <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-black font-bold text-xs">
                                                {user.avatar || user.name[0]}
                                            </div>
                                            {user.name}
                                        </td>
                                        <td className="p-4 text-gray-600">{user.email || 'Guest'}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.plan === 'pro' ? 'bg-purple-100 text-purple-700' :
                                                user.plan === 'enterprise' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {user.plan}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => navigate(`/users/${user._id}`)}
                                                className="text-black font-medium hover:underline text-sm"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="p-4 border-t flex items-center justify-between">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
