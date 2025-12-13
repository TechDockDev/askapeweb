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

    // return (
    // <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 md:bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-300">
            {/* Glass Container */}
            <div className="relative w-full max-w-md mx-4">
                {/* Background Blobs for Glass Effect */}
                <div className="absolute -top-20 -left-20 w-60 h-60 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute top-20 right-20 w-60 h-60 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

                <div className="relative bg-white/10 dark:bg-black/80 backdrop-blur-5xl border border-white/20 dark:border-white/10 rounded-2xl !p-6 shadow-2xl overflow-hidden ring-1 ring-black/5">

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/20 !p-2 rounded-full backdrop-blur-sm z-50"
                    >
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="flex flex-col items-center mb-8 relative z-10">
                        <div className="w-16 h-16 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl flex items-center justify-center !mb-3 text-white shadow-lg backdrop-blur-md border border-white/20">
                            <svg width="32" height="32" fill="none" stroke="#9A58F7" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-white !mb-3 text-center drop-shadow-sm">Invite Team</h2>
                        <p className="text-gray-300 text-center text-sm leading-relaxed max-w-[80%] font-medium !mb-2">
                            Share this link to collaborate with others. They will get instant access to the chat history.
                        </p>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div className="bg-black/10 backdrop-blur-md rounded-xl !p-2 border border-white/20 flex items-center gap-2 pr-2 shadow-inner group transition-all hover:bg-black/30 !mb-5">
                            <div className="flex-1 font-mono text-sm text-gray-200 truncate px-3 bg-transparent outline-none selection:bg-white/30">
                                {inviteLink}
                            </div>
                            <button
                                onClick={handleCopy}
                                className={`!px-4 !py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg backdrop-blur-sm border border-white/10 ${copied
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                                    }`}
                            >
                                {copied ? (
                                    <>
                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        <span>Copy</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="text-[10px] text-center text-gray-400 font-medium tracking-widest uppercase opacity-70">
                            Link expires upon session deletion
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
