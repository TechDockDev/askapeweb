import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('http://localhost:3001/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch users');
        }
    };

    const fetchUserDetails = async (id) => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get(`http://localhost:3001/api/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedUser(res.data);
        } catch (err) {
            console.error('Failed to fetch details');
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-8 text-gray-800">Users Management</h2>

            <div className="flex gap-6">
                {/* User List */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
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
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
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
                                            onClick={() => fetchUserDetails(user._id)}
                                            className="text-indigo-600 hover:underline text-sm"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* User Details Sidebar */}
                {selectedUser && (
                    <div className="w-96 bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-fit sticky top-4">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-xl font-bold">User Details</h3>
                            <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>

                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-20 h-20 rounded-full bg-indigo-100 mx-auto flex items-center justify-center text-indigo-600 font-bold text-2xl mb-3">
                                    {selectedUser.user.name[0]}
                                </div>
                                <h4 className="font-bold text-lg">{selectedUser.user.name}</h4>
                                <p className="text-gray-500 text-sm">{selectedUser.user.email}</p>
                                <div className="mt-2">
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold uppercase">
                                        {selectedUser.user.role}
                                    </span>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h5 className="font-semibold mb-3 text-sm text-gray-500 uppercase">Subscription</h5>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-gray-600">Current Plan</span>
                                        <span className="font-semibold capitalize">{selectedUser.user.plan}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Tokens</span>
                                        <span className="font-semibold">{selectedUser.user.totalTokensUsed}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h5 className="font-semibold mb-3 text-sm text-gray-500 uppercase">Recent Payments</h5>
                                <div className="space-y-2">
                                    {selectedUser.payments.length === 0 ? (
                                        <p className="text-sm text-gray-400 italic">No payment history</p>
                                    ) : (
                                        selectedUser.payments.map((payment, i) => (
                                            <div key={i} className="flex justify-between text-sm">
                                                <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                                                <span className="font-medium">${payment.amount}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
