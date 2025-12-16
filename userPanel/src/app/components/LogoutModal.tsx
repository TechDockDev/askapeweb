'use client';

interface LogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
}

export default function LogoutModal({ isOpen, onClose, onLogout }: LogoutModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 md:bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-300">
            {/* Glass Container */}
            <div className="relative w-full max-w-sm mx-4">
                {/* Background Blobs for Glass Effect */}
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-lime-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute top-20 right-20 w-40 h-40 bg-black/90 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

                <div className="relative bg-white/10 dark:bg-black/80 backdrop-blur-5xl border border-white/20 dark:border-white/10 rounded-2xl !p-6 shadow-2xl overflow-hidden ring-1 ring-black/5">

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/20 !p-2 rounded-full backdrop-blur-sm z-50"
                    >
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="flex flex-col items-center !mb-6 relative z-10">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-2xl flex items-center justify-center mb-4 text-red-500 shadow-lg backdrop-blur-md border border-white/10">
                            <svg width="32" height="32" fill="none" stroke="#c8ff00ff" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white !mb-2 text-center drop-shadow-sm">Sign Out?</h2>
                        <p className="text-gray-300 text-center text-sm leading-relaxed font-medium">
                            Are you sure you want to sign out? You will need to login again to access your chats.
                        </p>
                    </div>

                    <div className="flex gap-3 relative z-10">
                        <button
                            onClick={onClose}
                            className="flex-1 !px-4 !py-3 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all duration-200 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onLogout}
                            className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#DFFF00] to-lime-500 hover:from-lime-500 hover:to-[#DFFF00] text-black shadow-lg shadow-blue-500/20 border border-white/10 transition-all duration-200 cursor-pointer"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
