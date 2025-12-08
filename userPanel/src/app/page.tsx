'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { socketService } from './services/socket';
import './chat.css';

interface ChatMessage {
  id?: string;
  prompt: string;
  responses: {
    model: string;
    modelName: string;
    content: string;
    isComplete?: boolean;
    error?: string;
  }[];
}

interface ChatHistory {
  id: string;
  title: string;
  timestamp: number;
  messages: ChatMessage[];
  modelCount: number;
}

export default function ChatPage() {
  const router = useRouter();
  const [theme, setTheme] = useState('light');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [allChats, setAllChats] = useState<ChatHistory[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([
    'deepseek-ai/DeepSeek-V3',
    'meta-llama/Llama-3.2-3B-Instruct',
    'Qwen/Qwen2.5-Coder-32B-Instruct'
  ]);
  const [prompt, setPrompt] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Refs
  const chatDisplayRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]); // Ref to access latest state in callbacks

  // Sync ref with state
  useEffect(() => {
    messagesRef.current = currentMessages;
  }, [currentMessages]);

  const fetchSessions = async () => {
    const guestId = localStorage.getItem('askape_guest_id');
    const userId = user?.id;

    if (!guestId && !userId) return;

    try {
      const query = new URLSearchParams();
      if (userId) query.append('userId', userId);
      if (guestId) query.append('guestId', guestId);

      const res = await fetch(`http://localhost:3001/api/chat/sessions?${query.toString()}`);
      const data = await res.json();

      if (data.success) {
        setAllChats(data.sessions.map((s: any) => ({
          id: s.sessionId,
          title: s.title,
          timestamp: new Date(s.updatedAt || s.createdAt).getTime(),
          messages: [], // We don't load full messages for the list
          modelCount: s.messageCount || 0
        })));
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  useEffect(() => {
    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Load user
    const savedUser = localStorage.getItem('user');
    const userData = savedUser ? JSON.parse(savedUser) : null;
    setUser(userData);

    // Initial session fetch will happen after socket connects and we have guestId/userId OR if user is already loaded
  }, []);

  // Fetch sessions when user changes
  useEffect(() => {
    fetchSessions();
  }, [user]);

  useEffect(() => {
    // Connect Socket
    const token = localStorage.getItem('token') || undefined;
    const socket = socketService.connect(token);

    if (socket) {
      // Socket Event Listeners

      socket.on('session_joined', (data) => {
        console.log('Joined session:', data);
        if (data.guestId && !localStorage.getItem('askape_guest_id')) {
          localStorage.setItem('askape_guest_id', data.guestId);
          fetchSessions(); // Fetch sessions once we have a guest ID
        } else {
          fetchSessions(); // Refresh anyway
        }
      });

      socket.on('session_history', (history: any[]) => {
        console.log('Received history:', history);
        const formattedHistory: ChatMessage[] = history
          .filter(msg => msg.role === 'USER') // Filter for user messages to group pairs
          .map(userMsg => {
            return {
              id: userMsg.id,
              prompt: userMsg.content,
              responses: userMsg.aiResponses?.map((r: any) => ({
                model: r.modelId,
                modelName: r.modelId?.split('/').pop() || 'Model',
                content: r.content,
                isComplete: true
              })) || []
            };
          });

        // Only set messages if we have history, otherwise keep empty for new chat
        if (formattedHistory.length > 0) {
          setCurrentMessages(formattedHistory);
        }
      });

      socket.on('message_saved', (data) => {
        console.log('Message saved:', data);
      });

      socket.on('streaming_started', (data) => {
        setIsGenerating(true);
      });

      // Handle streaming chunks
      socket.on('message_chunk', (data) => {
        const { modelId, modelName, chunk, fullContent } = data;

        setCurrentMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          const lastMessage = newMessages[newMessages.length - 1];

          if (lastMessage) {
            const responseIndex = lastMessage.responses.findIndex(r => r.model === modelId);

            if (responseIndex !== -1) {
              // Update existing response
              lastMessage.responses[responseIndex].content = fullContent;
              lastMessage.responses[responseIndex].modelName = modelName;
            } else {
              // Add new response entry if not found
              lastMessage.responses.push({
                model: modelId,
                modelName: modelName,
                content: fullContent,
                isComplete: false
              });
            }
          }
          return newMessages;
        });
      });

      socket.on('model_streaming_complete', (data) => {
        const { modelId } = data;
        setCurrentMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage) {
            const response = lastMessage.responses.find(r => r.model === modelId);
            if (response) {
              response.isComplete = true;
            }
          }
          return newMessages;
        });
      });

      socket.on('all_responses_complete', () => {
        setIsGenerating(false);
        fetchSessions(); // Update list order/titles after chat interaction
      });

      socket.on('error', (err) => {
        showToast(`Error: ${err.message}`);
        setIsGenerating(false);
      });
    }

    // Initialize a new chat if none selected
    if (!currentChatId) {
      startNewChat();
    }

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatDisplayRef.current) {
      chatDisplayRef.current.scrollTo({
        top: chatDisplayRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [currentMessages]);


  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`);
  };

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2500);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const startNewChat = () => {
    const newId = Date.now().toString();
    setCurrentChatId(newId);
    setCurrentMessages([]); // Clear for UI

    // Join new session on socket
    const guestId = localStorage.getItem('askape_guest_id') || undefined;
    const userId = user?.id;

    socketService.joinSession(newId, userId, guestId);
    showToast('New chat started');

    // Also fetch sessions to ensure we have latest list
    fetchSessions();
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Optimistic update
    const updatedChats = allChats.filter(c => c.id !== chatId);
    setAllChats(updatedChats);

    try {
      await fetch(`http://localhost:3001/api/chat/sessions/${chatId}`, { method: 'DELETE' });
      showToast('Chat deleted');
    } catch (err) {
      showToast('Failed to delete chat');
      fetchSessions(); // Revert on error
    }

    if (chatId === currentChatId) startNewChat();
  };

  const handleUserClick = () => {
    if (user) {
      if (confirm('Do you want to logout?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        showToast('Logged out successfully');
        window.location.reload();
      }
    } else {
      router.push('/login');
    }
  };

  const sendRequest = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || selectedModels.length === 0) {
      if (selectedModels.length === 0) showToast('Please select at least one model');
      return;
    }

    if (!currentChatId) {
      startNewChat(); // Should exist, but safety check
      return;
    }

    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
    }

    // Optimistically add user message to UI
    const newTurn: ChatMessage = {
      prompt: trimmedPrompt,
      responses: selectedModels.map(model => ({
        model,
        modelName: model.split('/').pop() || model,
        content: '',
        isComplete: false
      }))
    };

    setCurrentMessages(prev => [...prev, newTurn]);

    // Send to Socket
    const guestId = localStorage.getItem('askape_guest_id') || undefined;
    const userId = user?.id;

    socketService.sendMessage(currentChatId, trimmedPrompt, selectedModels, userId, guestId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendRequest();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Copied to clipboard!'))
      .catch(() => showToast('Failed to copy'));
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const chatDate = date.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateLabel = chatDate === today ? 'Today' : chatDate === yesterday ? 'Yesterday' : date.toLocaleDateString();

    return `${dateLabel} ${timeStr}`;
  };

  // Helper to load a past chat
  const loadChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setCurrentMessages([]);

    const userId = user?.id;
    const guestId = localStorage.getItem('askape_guest_id') || undefined;
    socketService.joinSession(chatId, userId, guestId);
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="white" className="sparkle-icon">
              <path d="M12 1L13.5 8.5L21 10L13.5 11.5L12 19L10.5 11.5L3 10L10.5 8.5L12 1Z" />
              <path d="M19 2L19.75 4.25L22 5L19.75 5.75L19 8L18.25 5.75L16 5L18.25 4.25L19 2Z" opacity="0.7" />
              <path d="M5 16L5.5 17.5L7 18L5.5 18.5L5 20L4.5 18.5L3 18L4.5 17.5L5 16Z" opacity="0.7" />
            </svg>
          </div>
          <span className="logo-text">AskApe</span>
        </div>

        <button className="new-chat-btn" onClick={startNewChat}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>

        <div className="history-section">
          <div className="history-header">
            <span className="history-title">Chat History</span>
            <span className="history-count">{allChats.length} chat{allChats.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="history-list">
            {allChats.length === 0 ? (
              <div className="history-empty">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>No chat history yet.<br />Start a new conversation!</p>
              </div>
            ) : (
              allChats.map(chat => (
                <div
                  key={chat.id}
                  className={`history-item ${chat.id === currentChatId ? 'active' : ''}`}
                  onClick={() => loadChat(chat.id)}
                >
                  <div className="history-item-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="history-item-content">
                    <div className="history-item-title">{chat.title}</div>
                    <div className="history-item-meta">
                      <span>{formatDate(chat.timestamp)}</span>
                      <span>•</span>
                      <span>{chat.modelCount} models</span>
                    </div>
                  </div>
                  <button className="history-item-delete" onClick={(e) => deleteChat(chat.id, e)} title="Delete chat">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          <a href="/settings" className="nav-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="nav-item-text">Settings</span>
          </a>
          <a href="/payments" className="nav-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="nav-item-text">Payments</span>
            <span className="nav-item-badge">Pro</span>
          </a>
          <div className="theme-toggle">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <span className="theme-toggle-label">Dark Mode</span>
            <label className="theme-switch">
              <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
              <span className="theme-slider"></span>
            </label>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card" onClick={handleUserClick}>
            <div className="user-avatar">{user?.avatar || 'G'}</div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'Guest User'}</div>
              <div className="user-email">{user?.email || 'Click to login'}</div>
            </div>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-container">
        <div className="sticky-header">
          <div className="header-top">
            <button className="hamburger-menu" onClick={toggleSidebar}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="header-title">Compare AI Models</h1>
            <span className="badge">Multi-Model AI</span>
          </div>
          <div className="model-selector">
            {[
              { id: 'deepseek', value: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3' },
              { id: 'llama', value: 'meta-llama/Llama-3.2-3B-Instruct', label: 'Llama 3.2' },
              { id: 'qwen', value: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen Coder' }
            ].map(model => (
              <div key={model.id} className="model-chip">
                <input
                  type="checkbox"
                  id={model.id}
                  value={model.value}
                  checked={selectedModels.includes(model.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedModels([...selectedModels, model.value]);
                    } else {
                      setSelectedModels(selectedModels.filter(m => m !== model.value));
                    }
                  }}
                />
                <label htmlFor={model.id}>
                  <span className="model-indicator"></span>
                  {model.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <main className="main">
          <div className="chat-history" ref={chatDisplayRef}>
            {currentMessages.length === 0 ? (
              <div className="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3>Ready to Compare AI Models</h3>
                <p>Select your preferred models above and type a question below to see how different AI models respond.</p>
              </div>
            ) : (
              currentMessages.map((turn, turnIdx) => (
                <div key={turnIdx} className="chat-turn">
                  <div className="user-message">
                    <div className="user-message-label">You</div>
                    <div className="user-message-text">{turn.prompt}</div>
                  </div>
                  <div className="response-grid">
                    {turn.responses.map((resp, respIdx) => (
                      <div key={respIdx} className="response-card">
                        <div className="card-header">
                          <div className="card-title">
                            <span className={`status-dot ${resp.isComplete ? 'done' : resp.content ? 'active' : ''}`}></span>
                            <span>{resp.modelName}</span>
                          </div>
                          <button className="copy-btn" onClick={() => copyText(resp.content)}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                          </button>
                        </div>
                        <div className="card-content">
                          {resp.content ? (
                            <div className="markdown-content">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                              >
                                {resp.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div className="typing-indicator">
                              <span></span><span></span><span></span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </main>

        <div className="input-area">
          <div className="input-container">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Ask anything..."
              value={prompt}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
            />
            <button className="send-btn" onClick={sendRequest} disabled={isGenerating && false}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className="footer-text">Powered by Multi-Model Inference</p>
        </div>
      </div>

      {/* Toast */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>{toast.message}</span>
      </div>
    </>
  );
}
