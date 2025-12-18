import React from 'react';

const colorVariants = {
    blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
    },
    orange: {
        bg: 'bg-orange-50',
        text: 'text-orange-600',
    },
    purple: {
        bg: 'bg-purple-50',
        text: 'text-purple-600',
    },
    green: {
        bg: 'bg-green-50',
        text: 'text-green-600',
    },
};

export default function DashboardStatCard({ title, value, icon, trend, trendLabel, color = 'blue' }) {
    const theme = colorVariants[color] || colorVariants.blue;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start flex-col justify-between ">
                <div className={`p-3 rounded-xl ${theme.bg}`}>
                    <div className={`w-8 h-8 ${theme.text}`}>
                        {icon}
                    </div>
                </div>
            </div>
            <div className="flex items-start flex-col justify-between ">
                    <h3 className="text-2xl font-extrabold text-gray-900 mt-2 ml-2">{value}</h3>
                    <p className="text-gray-500 text-[12px] font-semibold uppercase tracking-wider mt-2">{title}</p>
                </div>
        </div>
    );
}
