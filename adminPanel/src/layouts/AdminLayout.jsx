import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, LogOut } from 'lucide-react';

export default function AdminLayout() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-indigo-600">AdminPanel</h1>
                </div>
                <nav className="mt-6">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            `flex items-center px-6 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 ${isActive ? 'bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600' : ''
                            }`
                        }
                    >
                        <LayoutDashboard size={20} className="mr-3" />
                        Dashboard
                    </NavLink>
                    <NavLink
                        to="/users"
                        className={({ isActive }) =>
                            `flex items-center px-6 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 ${isActive ? 'bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600' : ''
                            }`
                        }
                    >
                        <Users size={20} className="mr-3" />
                        Users
                    </NavLink>
                    <NavLink
                        to="/plans"
                        className={({ isActive }) =>
                            `flex items-center px-6 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 ${isActive ? 'bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600' : ''
                            }`
                        }
                    >
                        <CreditCard size={20} className="mr-3" />
                        Membership Plans
                    </NavLink>
                </nav>
                <div className="absolute bottom-0 w-64 p-6 border-t">
                    <button
                        onClick={handleLogout}
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
        </div>
    );
}
