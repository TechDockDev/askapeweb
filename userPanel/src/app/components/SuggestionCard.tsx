import React from 'react';

interface SuggestionCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
}

export default function SuggestionCard({
    title,
    description,
    icon,
    onClick,
}: SuggestionCardProps) {
    return (
        <div
            className="!bg-white dark:bg-[#1e1e2d] !p-6 rounded-2xl text-left cursor-pointer transition-transform duration-200 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:-translate-y-0.5"
            onClick={onClick}
        >
            <div className="!w-8 !h-8 bg-[#dfff00] rounded-lg !mb-4 flex items-center justify-center text-black">
                {icon}
            </div>
            <h3 className="font-semibold text-base !mb-2 !text-[#1a1a2e] dark:text-white">
                {title}
            </h3>
            <p className="text-sm text-gray-400 leading-snug">{description}</p>
        </div>
    );
}
