import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { API_BASE_URL } from '../config';

export default function UserDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [payments, setPayments] = useState([]);
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chatLoading, setChatLoading] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    useEffect(() => {
        fetchUserInfo();
        fetchUserChats();
    }, [id]);

    const fetchUserInfo = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get(`${API_BASE_URL}/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data.user);
            setPayments(res.data.payments);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch user info', err);
            setLoading(false);
        }
    };

    const fetchUserChats = async () => {
        try {
            // Reusing the chat session endpoint. 
            // Note: Ensure backend allows this call or add admin specific route if needed.
            // For now assuming getSessions allows userId query param.
            const res = await axios.get(`${API_BASE_URL}/chat/sessions`, {
                params: { userId: id }
            });
            setChats(res.data.sessions);
        } catch (err) {
            console.error('Failed to fetch user chats', err);
        }
    };

    const fetchChatHistory = async (sessionId) => {
        setChatLoading(true);
        setSelectedChat(sessionId);
        try {
            const res = await axios.get(`${API_BASE_URL}/chat/history/${sessionId}`);
            setMessages(res.data.messages);
        } catch (err) {
            console.error('Failed to fetch chat history', err);
        } finally {
            setChatLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!user) return <div className="p-8 text-center">User not found</div>;

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/users')} className="text-gray-500 hover:text-black">
                    ← Back to Users
                </button>
                <h1 className="text-2xl font-bold">User Details</h1>
            </div>

            <div className="flex gap-6 flex-1 overflow-hidden">
                {/* Left Sidebar: User Info & Chat List */}
                <div className="w-1/3 flex flex-col gap-6 overflow-hidden">
                    {/* User Profile Card */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex-shrink-0">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center text-black font-bold text-xl">
                                {user.avatar || user.name[0]}
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">{user.name}</h2>
                                <p className="text-gray-500 text-sm">{user.email}</p>
                                <span className={`mt-1 inline-block px-2 py-1 rounded text-xs font-medium ${user.plan === 'pro' ? 'bg-purple-100 text-purple-700' :
                                    user.plan === 'enterprise' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {user.plan}
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div className="bg-gray-50 p-3 rounded">
                                <span className="text-gray-500 block">Joined</span>
                                <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded">
                                <span className="text-gray-500 block">Total Tokens</span>
                                <span className="font-medium">{user.totalTokensUsed || 0}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="w-full py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            View Payment History
                        </button>
                    </div>

                    {/* Chat List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b">
                            <h3 className="font-bold">Chat History ({chats.length})</h3>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2">
                            {chats.map(chat => (
                                <div
                                    key={chat.sessionId}
                                    onClick={() => fetchChatHistory(chat.sessionId)}
                                    className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${selectedChat === chat.sessionId ? 'bg-brand/10 border-brand/50 border' : 'hover:bg-gray-50 border border-transparent'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-medium text-sm truncate pr-2">{chat.title || 'Untitled Chat'}</h4>
                                        <span className="text-xs text-gray-400 whitespace-nowrap">
                                            {new Date(chat.updatedAt || chat.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 text-xs text-gray-500">
                                        <span>{chat.messageCount} msgs</span>
                                        {chat.participantsCount > 0 && (
                                            <span className="bg-blue-100 text-blue-600 px-1 rounded">Group</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {chats.length === 0 && (
                                <p className="text-center text-gray-400 text-sm py-4">No chats found</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Chat Messages */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    {selectedChat ? (
                        <>
                            <div className="p-4 border-b flex justify-between items-center">
                                <h3 className="font-bold">Chat Messages</h3>
                                <span className="text-xs text-gray-400">Session ID: {selectedChat}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {chatLoading ? (
                                    <div className="text-center py-10 text-gray-400">Loading messages...</div>
                                ) : (
                                    messages.map((msg, idx) => (
                                        <div key={idx} className={`flex flex-col mb-6 ${msg.role === 'USER' ? 'items-end' : 'items-start'}`}>

                                            {/* User Message */}
                                            {msg.role === 'USER' && (
                                                <div className="flex flex-col items-end max-w-[80%]">
                                                    <div className="bg-brand/20 text-black px-4 py-3 rounded-2xl rounded-tr-sm shadow-sm border border-brand/10">
                                                        <div className="text-xs opacity-50 mb-1 font-semibold text-right">
                                                            {msg.sender?.name || 'User'}
                                                        </div>
                                                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 mt-1 mr-1">
                                                        {new Date(msg.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            )}

                                            {/* AI Message */}
                                            {msg.role !== 'USER' && (
                                                <div className="w-full">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold">
                                                            AI
                                                        </div>
                                                        <span className="text-xs font-semibold text-gray-500">
                                                            {msg.aiResponses?.length > 0 ? `${msg.aiResponses.length} Responses` : 'Response'}
                                                        </span>
                                                        <span className="text-[10px] text-gray-300 ml-auto">
                                                            {new Date(msg.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>

                                                    {/* Response Grid */}
                                                    <div className={`grid gap-4 ${msg.aiResponses?.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                                                        {(msg.aiResponses && msg.aiResponses.length > 0 ? msg.aiResponses : [{ content: msg.content, modelId: 'Default' }]).map((resp, i) => (
                                                            <div key={i} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                                                                {/* Card Header */}
                                                                <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex justify-between items-center">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-2 h-2 rounded-full ${resp.isComplete !== false ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                                                        <span className="text-xs font-bold text-gray-700 font-mono">
                                                                            {resp.modelId?.split('/').pop() || resp.modelName || 'Model'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Card Body */}
                                                                <div className="p-4 bg-white text-sm">
                                                                    <div className="prose prose-sm max-w-none prose-p:my-2 prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-3 prose-pre:rounded-lg prose-code:text-pink-600 prose-code:bg-pink-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                                                                        <ReactMarkdown
                                                                            components={{
                                                                                code({ node, inline, className, children, ...props }) {
                                                                                    return !inline ? (
                                                                                        <div className="relative group">
                                                                                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                                <span className="text-[10px] text-gray-400">Code</span>
                                                                                            </div>
                                                                                            <code className="block overflow-x-auto" {...props}>
                                                                                                {children}
                                                                                            </code>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <code {...props}>{children}</code>
                                                                                    )
                                                                                }
                                                                            }}
                                                                        >
                                                                            {resp.content || ''}
                                                                        </ReactMarkdown>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                                {!chatLoading && messages.length === 0 && (
                                    <p className="text-center text-gray-400 py-10">No messages in this chat</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            Select a chat to view history
                        </div>
                    )}
                </div>
            </div>

            {/* Payment History Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setIsPaymentModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b">
                            <h3 className="text-xl font-bold">Payment History</h3>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-black transition-colors">
                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-0 max-h-[60vh] overflow-y-auto">
                            {payments.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <p>No payment history found for this user.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium">
                                        <tr>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Reference ID</th>
                                            <th className="px-6 py-3 text-right">Amount</th>
                                            <th className="px-6 py-3 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {payments.map((payment, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4">{new Date(payment.createdAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-gray-400 font-mono text-xs">{payment._id.slice(-8)}</td>
                                                <td className="px-6 py-4 text-right font-medium">${payment.amount}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Success
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
