'use client';

import { useState } from 'react';

interface AddMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
    onMemberAdded: (member: any) => void;
}

export default function AddMembersModal({ isOpen, onClose, sessionId, onMemberAdded }: AddMembersModalProps) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/?join=${sessionId}` : '';

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl w-full max-w-md p-8 shadow-2xl relative transform transition-all scale-100">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 text-blue-500">
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Invite People</h2>
                    <p className="text-gray-400 text-center text-sm">
                        Share this link with anyone you want to join this conversation. They'll be able to see history and chat in real-time.
                    </p>
                </div>

                <div className="bg-[#27272a] rounded-xl p-4 mb-2 border border-[#3f3f46]">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 font-mono text-sm text-gray-300 truncate select-all">
                            {inviteLink}
                        </div>
                        <button
                            onClick={handleCopy}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${copied
                                    ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                }`}
                        >
                            {copied ? (
                                <>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Copied
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy
                                </>
                            )}
                        </button>
                    </div>
                </div>
                <p className="text-xs text-center text-gray-500">
                    Links expire when the session is deleted.
                </p>
            </div>
        </div>
    );
}
