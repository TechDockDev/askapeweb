import React from "react";

interface Chat {
    id: string;
    title: string;
    timestamp: number;
    modelCount: number;
    participantsCount: number;
}

interface User {
    id: string;
    name: string;
    email: string;
    avatar: string;
}

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onStartNewChat: () => void;
    allChats: Chat[];
    currentChatId: string | null;
    onLoadChat: (id: string) => void;
    onDeleteChat: (id: string, e: React.MouseEvent) => void;
    onUserClick: () => void;
    ownerId?: string | null;
    theme: string;
    handleThemeToggle: () => void;
}

export default function Sidebar({
    isOpen,
    onClose,
    user,
    onStartNewChat,
    allChats,
    currentChatId,
    onLoadChat,
    onDeleteChat,
    onUserClick,
    ownerId,
    theme,
    handleThemeToggle,
}: SidebarProps) {
    // const formatDate = (timestamp: number) => {
    //     const date = new Date(timestamp);
    //     const today = new Date().toDateString();
    //     const yesterday = new Date(Date.now() - 86400000).toDateString();
    //     const chatDate = date.toDateString();

    //     return chatDate === today
    //         ? "Today"
    //         : chatDate === yesterday
    //             ? "Yesterday"
    //             : date.toLocaleDateString();
    // };

    return (
        <>
            <div
                className={`sidebar-overlay ${isOpen ? "active" : ""}`}
                onClick={onClose}
            />

            <aside
                className={`fixed top-0 left-0 z-[100] h-screen w-[250px] bg-black shadow-md transition-transform duration-300 flex flex-col md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="!pt-5 !px-5 flex items-center gap-3 !mb-2">
                    <div className="logo-icon">
                        <svg viewBox="0 0 24 24" fill="white" className="sparkle-icon">
                            <path d="M12 1L13.5 8.5L21 10L13.5 11.5L12 19L10.5 11.5L3 10L10.5 8.5L12 1Z" />
                            <path
                                d="M19 2L19.75 4.25L22 5L19.75 5.75L19 8L18.25 5.75L16 5L18.25 4.25L19 2Z"
                                opacity="0.7"
                            />
                            <path
                                d="M5 16L5.5 17.5L7 18L5.5 18.5L5 20L4.5 18.5L3 18L4.5 17.5L5 16Z"
                                opacity="0.7"
                            />
                        </svg>
                    </div>
                    <span className="text-xl font-bold text-white">AskApe</span>
                </div>

                {user ? (
                    <button
                        className="!pt-3.5 !pb-2 !-ml-24 text-white font-semibold text-sm flex items-center justify-center gap-2"
                        onClick={onStartNewChat}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-square-pen-icon lucide-square-pen"
                        >
                            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                        </svg>
                        <p>New Chat</p>
                    </button>
                ) : (
                    <div className="!mx-4 !mt-6 !px-4 !py-3 text-center text-sm text-gray-400 bg-white/5 rounded-lg mb-2.5">
                        Login to save history
                    </div>
                )}

                <div className="flex-1 overflow-y-auto !px-4 !py-4 !space-y-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                    {user &&
                        allChats.filter((c) => c.participantsCount > 0).length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between !px-2 !pb-2 border-b border-[#333]">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Group chats
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {allChats
                                        .filter((c) => c.participantsCount > 0)
                                        .map((chat) => (
                                            <div
                                                key={chat.id}
                                                className={`group flex items-center gap-3 !p-2 rounded-xl cursor-pointer transition-all ${chat.id === currentChatId
                                                    ? "bg-[#212121] border border-indigo-500/30"
                                                    : "hover:bg-white/5 border border-transparent"
                                                    }`}
                                                onClick={() => onLoadChat(chat.id)}
                                            >
                                                {/* <div className="w-8 h-8 flex-shrink-0 flex -space-x-2">
                                            <div className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center transition-colors group-hover:bg-[#333]">
                                                <div className="text-xs font-bold text-white">G</div>
                                            </div>
                                        </div> */}
                                                <div className="flex-1 min-w-0">
                                                    <div
                                                        className={`text-sm font-medium truncate ${chat.id === currentChatId
                                                            ? "text-white"
                                                            : "text-gray-300"
                                                            }`}
                                                    >
                                                        {chat.title}
                                                    </div>
                                                    {/* <div className="text-[10px] text-gray-500 !mt-0.5 truncate">
                                                {formatDate(chat.timestamp)}
                                            </div> */}
                                                </div>
                                                {user && ownerId && user.id === ownerId && (
                                                    <button
                                                        className="opacity-0 group-hover:opacity-100 !p-1.5 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400 transition-all"
                                                        onClick={(e) => onDeleteChat(chat.id, e)}
                                                        title="Delete chat"
                                                    >
                                                        <svg
                                                            width="14"
                                                            height="14"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                            />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                    <div className="space-y-3">
                        <div className="flex items-center justify-between !px-2 !pb-2 border-b border-[#333]">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Your chats
                            </span>
                        </div>

                        <div className="space-y-1">
                            {!user ? (
                                <div className="!py-8 text-center text-gray-600">
                                    <p className="text-sm opacity-60">
                                        History is disabled for guest users.
                                    </p>
                                </div>
                            ) : allChats.length === 0 ? (
                                <div className="flex flex-col items-center justify-center !py-10 text-center text-gray-600 space-y-3">
                                    <svg
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        className="w-10 h-10 opacity-30"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="1.5"
                                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                        />
                                    </svg>
                                    <p className="text-sm">
                                        No chat history yet.
                                        <br />
                                        Start a new conversation!
                                    </p>
                                </div>
                            ) : (
                                allChats
                                    .filter((c) => c.participantsCount === 0)
                                    .map((chat) => (
                                        <div
                                            key={chat.id}
                                            className={`group flex items-center gap-3 !p-2 rounded-xl cursor-pointer transition-all ${chat.id === currentChatId
                                                ? "bg-indigo-600/20 border border-indigo-500/30 shadow-lg shadow-indigo-900/10"
                                                : "hover:bg-white/5 border border-transparent"
                                                }`}
                                            onClick={() => onLoadChat(chat.id)}
                                        >
                                            {/* <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${chat.id === currentChatId ? 'bg-indigo-500 text-white' : 'bg-[#2a2a2a] text-gray-400 group-hover:bg-[#333] group-hover:text-white'}`}> */}
                                            {/* <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg> */}
                                            {/* </div> */}
                                            <div className="flex-1 min-w-0">
                                                <div
                                                    className={`text-sm font-medium truncate ${chat.id === currentChatId
                                                        ? "text-white"
                                                        : "text-gray-300 group-hover:text-white"
                                                        }`}
                                                >
                                                    {chat.title}
                                                </div>
                                                {/* <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-gray-500">{formatDate(chat.timestamp)}</span>
                                                <span className="text-[10px] text-gray-600">•</span>
                                                <span className="text-[10px] text-gray-500">{chat.modelCount} models</span>
                                            </div> */}
                                            </div>
                                            <button
                                                className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${chat.id === currentChatId
                                                    ? "hover:bg-indigo-500 text-white/50 hover:text-white"
                                                    : "hover:bg-red-500/20 text-gray-500 hover:text-red-400"
                                                    }`}
                                                onClick={(e) => onDeleteChat(chat.id, e)}
                                                title="Delete chat"
                                            >
                                                <svg
                                                    width="14"
                                                    height="14"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>

                <nav className="p-4 border-t border-[#333] space-y-2">
                    <a
                        href="/payments"
                        className="flex items-center !gap-3 !p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all group no-underline"
                    >
                        <svg
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            className="w-5 h-5 flex-shrink-0 group-hover:text-indigo-400 transition-colors"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            />
                        </svg>
                        <span className="text-sm font-medium flex-1">Payments</span>
                        {/* <span className="!px-2 !py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-[#CCFF01] to-[#CCFF01] ">PRO</span> */}
                    </a>
                    {/* <div className="flex items-center gap-3 p-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20" className="flex-shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                        <span className="text-sm font-medium flex-1">Dark Mode</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={theme === 'dark'} onChange={handleThemeToggle} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div> */}
                </nav>

                <div className="!p-3 border-t border-[#333] mt-auto">
                    <div
                        className="flex items-center gap-3 !p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all group border border-transparent hover:border-indigo-500/30"
                        onClick={onUserClick}
                    >
                        <div className="!w-9 !h-9 rounded-lg bg-gradient-to-br from-lime-500 to-[#CCFF01] flex items-center justify-center text-sm font-bold text-white shadow-lg">
                            {user?.avatar || "G"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                                {user?.name || "Guest User"}
                            </div>
                            <div className="text-xs text-gray-500 truncate group-hover:text-gray-400">
                                {user?.email || "Click to login"}
                            </div>
                        </div>
                        <svg
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            className="text-gray-600 group-hover:text-white transition-colors"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </div>
                </div>
            </aside>
        </>
    );
}
