import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, LogOut } from 'lucide-react';

export default function AdminLayout() {
    const navigate = useNavigate();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogoutClick = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-main relative">
            {/* Sidebar */}
            <aside className="w-64 bg-black shadow-md border-r border-gray-800">
                <div className="p-6 flex items-center gap-3">
                    <img src="/logo.png" alt="AskApe Logo" className="w-14 h-14 object-contain" />
                    <h1 className="text-2xl font-bold text-white">AskApe Admin</h1>
                </div>
                <nav className="mt-2 flex flex-col gap-2">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            `flex items-center px-6 py-3 rounded-xl mx-2 text-white hover:bg-gray-800 hover:text-brand ${isActive ? 'bg-gray-800' : ''
                            }`
                        }
                    >
                        <LayoutDashboard size={20} className="mr-3" />
                        Dashboard
                    </NavLink>
                    <NavLink
                        to="/users"
                        className={({ isActive }) =>
                            `flex items-center px-6 py-3 rounded-xl mx-2 text-white hover:bg-gray-800 hover:text-brand ${isActive ? 'bg-gray-800' : ''
                            }`
                        }
                    >
                        <Users size={20} className="mr-3" />
                        Users
                    </NavLink>
                    <NavLink
                        to="/plans"
                        className={({ isActive }) =>
                            `flex items-center px-6 py-3 rounded-xl mx-2 text-white hover:bg-gray-800 hover:text-brand ${isActive ? 'bg-gray-800' : ''
                            }`
                        }
                    >
                        <CreditCard size={20} className="mr-3" />
                        Membership Plans
                    </NavLink>
                </nav>
                <div className="absolute bottom-0 w-64 p-6 border-t border-gray-800">
                    <button
                        onClick={handleLogoutClick}
                        className="flex items-center text-red-500 hover:text-red-700 w-full"
                    >
                        <LogOut size={20} className="mr-3" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">
                <Outlet />
            </main>

            {/* Logout Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-96 transform transition-all scale-100">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">Confirm Logout</h3>
                        <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-medium transition"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
