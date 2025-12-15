'use client';

import { useEffect, useState, useRef, Suspense, useLayoutEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { socketService } from './services/socket';
import api from '../config/api';
import './chat.css';
import { useTheme } from '../providers/ThemeProvider';
import AddMembersModal from './components/AddMembersModal';
import LogoutModal from './components/LogoutModal';

interface ChatMessage {
  id?: string;
  userId?: string;
  prompt: string;
  sender?: {
    name: string;
    avatar: string;
  };
  timestamp?: number;
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
  participantsCount: number;
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();
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
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ id: string, name: string }[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const initialLoadDone = useRef(false);

  // Refs
  const chatDisplayRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]); // Ref to access latest state in callbacks
  const currentChatIdRef = useRef<string | null>(null); // Ref for socket handlers
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const isAutoScrollingRef = useRef(false);

  // Sync ref with state
  useEffect(() => {
    messagesRef.current = currentMessages;
  }, [currentMessages]);

  useEffect(() => {
    currentChatIdRef.current = currentChatId;
    setTypingUsers([]);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [currentChatId]);

  const fetchSessions = async () => {
    const guestId = localStorage.getItem('askape_guest_id');
    // Read user directly from local storage to avoid stale closure issues in socket listeners
    const savedUserStr = localStorage.getItem('user');
    const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
    const userId = savedUser?.id;

    // If guest, don't fetch sessions (History not allowed for guests)
    if (!userId) {
      setAllChats([]);
      return;
    }

    if (!guestId && !userId) return;

    try {
      //api - removed
      const res = await api.get('/chat/sessions', {
        params: { userId }
      });
      const data = res.data;

      if (data.success) {
        setAllChats(data.sessions.map((s: any) => ({
          id: s.sessionId,
          title: s.title,
          timestamp: new Date(s.updatedAt || s.createdAt).getTime(),
          messages: [], // We don't load full messages for the list
          modelCount: s.messageCount || 0,
          participantsCount: s.participantsCount || 0
        })));
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  useEffect(() => {
    // Load user
    const savedUser = localStorage.getItem('user');
    const userData = savedUser ? JSON.parse(savedUser) : null;
    const isGuest = localStorage.getItem('askape_is_guest');

    // Auth Check
    if (!userData && !isGuest) {
      router.push('/login');
      return;
    }

    setUser(userData);

    // Initial session fetch
    // We'll also handle URL chatId here for initial load
  }, []);

  // Handle URL chatId on mount or param change
  useEffect(() => {
    if (initialLoadDone.current) return;

    const urlChatId = searchParams.get('chatId');
    const joinId = searchParams.get('join');

    // If we are joining, don't restore yet, wait for join logic
    if (joinId) return;

    if (urlChatId && urlChatId !== currentChatId) {
      console.log('Restoring chat from URL:', urlChatId);
      setCurrentChatId(urlChatId);
      initialLoadDone.current = true;
    }
  }, [searchParams]);

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
        if (data.participants) {
          setParticipants(data.participants);
        } else {
          setParticipants([]);
        }

        if (data && data.ownerId) {
          setOwnerId(data.ownerId);
        } else {
          setOwnerId(null);
        }

        if (data.guestId && !localStorage.getItem('askape_guest_id')) {
          localStorage.setItem('askape_guest_id', data.guestId);
          fetchSessions(); // Fetch sessions once we have a guest ID
        } else {
          fetchSessions(); // Refresh anyway
        }
      });

      socket.on('system_notification', (data) => {
        if (data.type === 'member_joined') {
          showToast(data.message);
          setParticipants(prev => {
            if (prev.find(p => p._id === data.member._id)) return prev;
            return [...prev, data.member];
          });
        }
      });

      socket.on('user_message', (data) => {
        console.log('Received user message:', data);
        // data: { id, role, content, userId, ... }
        // Verify it's not our own message (duplicates handled by optimistic UI, but good to check?)
        // Actually optimistic UI handles own. But socket broadcasts to others in room using socket.to(room). 
        // Sender doesn't receive it back usually with socket.to().
        // So we can safely append.

        setCurrentMessages(prev => {
          // Avoid duplicates if any
          if (prev.find(m => m.id === data.id)) return prev;

          return [...prev, {
            id: data.id,
            prompt: data.content,
            userId: data.userId,
            sender: data.sender,
            timestamp: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
            responses: []
          }];
        });

        // Ensure scrolling happens
        setTimeout(() => {
          if (chatDisplayRef.current) {
            chatDisplayRef.current.scrollTo({ top: chatDisplayRef.current.scrollHeight, behavior: 'smooth' });
          }
        }, 100);
      });

      // ... (other listeners same as before) ...

      socket.on('session_history', (history: any[]) => {
        console.log('Received history:', history);
        const formattedHistory: ChatMessage[] = [];

        for (let i = 0; i < history.length; i++) {
          const msg = history[i];
          if (msg.role === 'USER') {
            const nextMsg = history[i + 1];
            const aiResponses = (nextMsg && nextMsg.role === 'AI') ? (nextMsg.aiResponses || []) : [];

            formattedHistory.push({
              id: msg.id,
              userId: msg.sender && msg.role === 'USER' && msg.userId && msg.userId._id ? msg.userId._id : undefined, // Check nested
              prompt: msg.content,
              sender: msg.sender,
              timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : undefined,
              responses: aiResponses.map((r: any) => ({
                model: r.modelId,
                modelName: r.modelId?.split('/').pop() || 'Model',
                content: r.content,
                isComplete: true
              }))
            });
          }
        }

        // Only set messages if we have history, otherwise keep empty for new chat
        if (formattedHistory.length > 0) {
          setCurrentMessages(formattedHistory);
          // Allow pagination if we got a full batch (approx 50)
          setHasMoreHistory(formattedHistory.length >= 50);
        } else {
          setCurrentMessages([]);
          setHasMoreHistory(false);
        }
        setIsLoadingMore(false);
      });

      socket.on('history_chunk', (data: { sessionId: string, messages: any[], hasMore: boolean }) => {
        if (currentChatIdRef.current && data.sessionId !== currentChatIdRef.current) return;

        console.log('Received history chunk:', data.messages.length, 'hasMore:', data.hasMore);

        const formattedChunk: ChatMessage[] = [];
        for (let i = 0; i < data.messages.length; i++) {
          const msg = data.messages[i];
          if (msg.role === 'USER') {
            const nextMsg = data.messages[i + 1];
            const aiResponses = (nextMsg && nextMsg.role === 'AI') ? (nextMsg.aiResponses || []) : [];

            formattedChunk.push({
              id: msg.id,
              userId: msg.sender && msg.role === 'USER' && msg.userId && msg.userId._id ? msg.userId._id : undefined,
              prompt: msg.content,
              sender: msg.sender,
              timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : undefined,
              responses: aiResponses.map((r: any) => ({
                model: r.modelId,
                modelName: r.modelId?.split('/').pop() || 'Model',
                content: r.content,
                isComplete: true
              }))
            });
          }
        }

        if (formattedChunk.length > 0) {
          setCurrentMessages(prev => [...formattedChunk, ...prev]);
        }
        setHasMoreHistory(data.hasMore);
        setIsLoadingMore(false);

        // Scroll restoration happens in useLayoutEffect
      });

      socket.on('message_saved', (data) => {
        console.log('Message saved:', data);
        fetchSessions(); // Refresh sidebar to show the new chat with its title immediately
      });

      socket.on('streaming_started', (data) => {
        setIsGenerating(true);
      });

      // Handle streaming chunks
      socket.on('message_chunk', (data) => {
        const { sessionId, modelId, modelName, chunk, fullContent } = data;

        // Filter out events from other sessions
        if (sessionId && currentChatIdRef.current && sessionId !== currentChatIdRef.current) return;

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
        const { sessionId, modelId } = data;
        if (sessionId && currentChatIdRef.current && sessionId !== currentChatIdRef.current) return;

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

      socket.on('model_error', (data) => {
        const { sessionId, modelId, error } = data;
        if (sessionId && currentChatIdRef.current && sessionId !== currentChatIdRef.current) return;

        setCurrentMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage) {
            const response = lastMessage.responses.find(r => r.model === modelId);
            if (response) {
              response.error = error;
              response.isComplete = true; // Mark as complete so loading spinner stops
            }
          }
          return newMessages;
        });
        showToast(`Error from model: ${error}`);
      });

      socket.on('typing_started', (data) => {
        if (currentChatIdRef.current && data.sessionId !== currentChatIdRef.current) return;
        setTypingUsers(prev => {
          if (prev.find(u => u.id === data.user.id)) return prev;
          return [...prev, data.user];
        });
      });

      socket.on('typing_stopped', (data) => {
        if (currentChatIdRef.current && data.sessionId !== currentChatIdRef.current) return;
        setTypingUsers(prev => prev.filter(u => u.id !== data.user.id));
      });

      // Collaborative Input Listener
      socket.on('input_changed', (data) => {
        if (currentChatIdRef.current && data.sessionId === currentChatIdRef.current) {
          // If the update is NOT from me (which it shouldn't be via broadcast, but good to check against user state)
          // Actually checking userId is tricky if we are guest.
          // But socket.to() doesn't send back to sender, so it's safe to apply.
          setPrompt(data.content);

          // Adjust height
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset
            // We need to wait for render or force calculate. 
            // Setting value doesn't auto-resize immediately in React standard flow without the onChange trigger.
            // We can do it in useEffect or timeout.
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
              }
            }, 0);
          }
        }
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

    // Restore chat from URL if available
    const urlChatId = searchParams.get('chatId');
    const joinId = searchParams.get('join');

    if (joinId) {
      // Handle join link
      const savedUser = localStorage.getItem('user'); // Basic check, better to use 'user' state but it might be null initially
      if (!savedUser) {
        console.log('Redirecting to login for join');
        router.push(`/login?redirect=/?join=${joinId}`);
        return;
      }

      const userData = JSON.parse(savedUser);
      // Call API to join
      // /api - removed 
      api.post(`/chat/sessions/${joinId}/participants`, { userId: userData.id })
        .then(() => {
          showToast('Joined conversation');
          router.push(`/?chatId=${joinId}`);
        })
        .catch(err => {
          console.error('Join failed', err);
          showToast('Failed to join conversation');
          // Even if failed (e.g. already member), try to load it
          router.push(`/?chatId=${joinId}`);
        });
    } else if (urlChatId) {
      // Join that session
      const guestId = localStorage.getItem('askape_guest_id') || undefined;
      // User might not be loaded yet in 'user' state variable, read from localStorage for immediate join
      const savedUserStr = localStorage.getItem('user');
      const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
      const userId = savedUser ? savedUser.id : undefined;

      const token = localStorage.getItem('token');
      if (savedUser && token) {
        setUser(savedUser);
      } else {
        // Check for guest flag
        const isGuest = localStorage.getItem('askape_is_guest');
        if (!isGuest) {
          router.push('/login');
        }
      }

      console.log('🔗 Joining session from URL:', urlChatId);
      setCurrentChatId(urlChatId);
      socketService.joinSession(urlChatId, userId, guestId);
    }

    return () => {
      socketService.disconnect();
    };
  }, []); // Run once on mount

  // Auto-scroll logic
  useLayoutEffect(() => {
    if (!chatDisplayRef.current) return;

    const container = chatDisplayRef.current;

    // Check if we are prepending messages (pagination)
    if (isLoadingMore) {
      // We are waiting for data, do nothing yet
      return;
    }

    // Logic to distinguish between "new message appended" vs "old messages prepended"
    // We utilize the prevScrollHeightRef

    const newScrollHeight = container.scrollHeight;
    const scrollDiff = newScrollHeight - prevScrollHeightRef.current;

    // If we just loaded more history (and we were at top), restore position
    // We check if the scrollHeight has grown significantly and we were near top
    if (container.scrollTop === 0 && scrollDiff > 0 && messagesRef.current.length > 0) {
      // Restore scroll position
      container.scrollTop = scrollDiff;
    } else {
      // Normal auto-scroll to bottom for new messages
      // Only scroll if we were already near bottom OR it's a new generation
      // Or blindly scroll to bottom if it's initial load. 
      // Let's assume on new message append we want to view it.

      // Simple heuristic: If scrollHeight grew and we didn't prepend (implied by scrollTop not being 0 or checking manually)
      // Actually, cleaner way:
      if (prevScrollHeightRef.current === 0 || isAutoScrollingRef.current) {
        container.scrollTop = container.scrollHeight;
        isAutoScrollingRef.current = false;
      } else {
        // Smooth scroll to bottom
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }

    prevScrollHeightRef.current = newScrollHeight;
  }, [currentMessages, isLoadingMore]);

  // Handle scroll for pagination
  const handleScroll = () => {
    if (!chatDisplayRef.current) return;
    const { scrollTop } = chatDisplayRef.current;

    if (scrollTop === 0 && hasMoreHistory && !isLoadingMore && currentMessages.length > 0) {
      console.log('Reached top, fetching older history...');
      setIsLoadingMore(true);
      prevScrollHeightRef.current = chatDisplayRef.current.scrollHeight; // Save before fetch

      const outputMsg = currentMessages[0];
      // We need the USER message ID.
      // Be careful: currentMessages structure.
      // We need to pass the ID of the oldest message we have.
      // currentMessages[0] is the oldest visible.
      if (outputMsg && outputMsg.id) {
        socketService.fetchHistory(currentChatId!, outputMsg.id);
      }
    }
  };

  useEffect(() => {
    // Reset auto-scrolling flag on chat switch
    isAutoScrollingRef.current = true;
    setHasMoreHistory(true); // Reset expectation
    prevScrollHeightRef.current = 0;
  }, [currentChatId]);


  const handleThemeToggle = () => {
    toggleTheme();
    showToast(`${theme === 'dark' ? 'Light' : 'Dark'} mode enabled`);
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
    // Check if the latest personal chat is empty. If so, reuse it.
    const latestPersonalChat = allChats.find(c => c.participantsCount === 0);
    if (latestPersonalChat && latestPersonalChat.modelCount === 0) {
      if (currentChatId !== latestPersonalChat.id) {
        loadChat(latestPersonalChat.id);
      } else {
        // Already on the empty chat, just clear input
        setPrompt('');
        showToast('Already on a new chat');
      }
      return;
    }

    if (currentChatId) {
      socketService.leaveSession(currentChatId);
    }
    const newId = crypto.randomUUID();
    setCurrentChatId(newId);
    setCurrentMessages([]); // Clear for UI
    setPrompt(''); // Clear input
    setIsGenerating(false); // Reset generation state

    // Update URL to persist session on refresh
    router.push(`/?chatId=${newId}`);

    // Join new session on socket
    const guestId = localStorage.getItem('askape_guest_id') || undefined;
    const userId = user?.id;

    socketService.joinSession(newId, userId, guestId);
    showToast('New chat started');

    // Also fetch sessions to ensure we have latest list
    fetchSessions();
    setTypingUsers([]);
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Optimistic update
    const updatedChats = allChats.filter(c => c.id !== chatId);
    setAllChats(updatedChats);

    try {
      // /api - removed
      await api.delete(`/chat/sessions/${chatId}`);
      showToast('Chat deleted');
    } catch (err) {
      showToast('Failed to delete chat');
      fetchSessions(); // Revert on error
    }

    if (chatId === currentChatId) startNewChat();
  };

  const handleUserClick = () => {
    if (user) {
      setIsLogoutModalOpen(true);
    } else {
      router.push('/login');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    showToast('Logged out successfully');
    window.location.reload();
  };

  const sendRequest = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || selectedModels.length === 0) {
      if (selectedModels.length === 0) showToast('Please select at least one model');
      return;
    }

    let activeChatId = currentChatId;
    if (!activeChatId) {
      // Lazy init: Create session ID without clearing input
      activeChatId = crypto.randomUUID();
      setCurrentChatId(activeChatId);
      // Update URL
      router.push(`/?chatId=${activeChatId}`);

      // Join new session on socket
      const guestId = localStorage.getItem('askape_guest_id') || undefined;
      const userId = user?.id;
      socketService.joinSession(activeChatId, userId, guestId);
    }

    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
    }

    // Optimistically add user message to UI
    const newTurn: ChatMessage = {
      prompt: trimmedPrompt,
      userId: user?.id,
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

    socketService.sendMessage(activeChatId, trimmedPrompt, selectedModels, userId, guestId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendRequest();
    }
  };

  const handleTyping = () => {
    if (!currentChatId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      // Start typing
      const userId = user?.id || localStorage.getItem('askape_guest_id') || 'guest';
      const userName = user?.name || 'Guest';
      socketService.emitTyping(currentChatId, { id: userId, name: userName });
    }

    typingTimeoutRef.current = setTimeout(() => {
      const userId = user?.id || localStorage.getItem('askape_guest_id') || 'guest';
      const userName = user?.name || 'Guest';
      socketService.emitStopTyping(currentChatId, { id: userId, name: userName });
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPrompt(text);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
    handleTyping();

    // Collaborative Sync
    if (currentChatId) {
      const userId = user?.id || localStorage.getItem('askape_guest_id');
      socketService.emitInputChange(currentChatId, text, userId);
    }
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

    // Update URL
    router.push(`/?chatId=${chatId}`);

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

        {user ? (
          <button className="new-chat-btn" onClick={startNewChat}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        ) : (
          <div className="guest-notice" style={{ padding: '10px 15px', color: '#888', fontSize: '0.9rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '10px' }}>
            Login to save history
          </div>
        )}

        <div className="history-section">
          {user && allChats.filter(c => c.participantsCount > 0).length > 0 && (
            <div className="history-group">
              <div className="history-header">
                <span className="history-title">Group chats</span>
              </div>
              <div className="history-list">
                {allChats.filter(c => c.participantsCount > 0).map(chat => (
                  <div
                    key={chat.id}
                    className={`history-item ${chat.id === currentChatId ? 'active' : ''}`}
                    onClick={() => loadChat(chat.id)}
                  >
                    <div className="history-item-icon">
                      <div className="flex -space-x-1">
                        <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] text-white border border-[#1e1e1e]">G</div>
                        {/* Placeholder for group icon */}
                      </div>
                    </div>
                    <div className="history-item-content">
                      <div className="history-item-title">{chat.title}</div>
                      <div className="history-item-meta">
                        <span>{formatDate(chat.timestamp)}</span>
                      </div>
                    </div>
                    {user && ownerId && user.id === ownerId && (
                      <button className="history-item-delete" onClick={(e) => deleteChat(chat.id, e)} title="Delete chat">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="history-group">
            <div className="history-header">
              <span className="history-title">Your chats</span>
            </div>

            <div className="history-list">
              {!user ? (
                <div className="history-empty">
                  <p style={{ opacity: 0.6 }}>History is disabled for guest users.</p>
                </div>
              ) : allChats.length === 0 ? (
                <div className="history-empty">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>No chat history yet.<br />Start a new conversation!</p>
                </div>
              ) : (
                allChats.filter(c => c.participantsCount === 0).map(chat => (
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

        </div>

        <nav className="sidebar-nav">
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
              <input type="checkbox" checked={theme === 'dark'} onChange={handleThemeToggle} />
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
        <div className="sticky-header flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-[#333]">
          {/* Left Side: Model Selector - w-1/3 */}
          <div className="w-1/3 flex justify-start">
            <div className="model-selector relative z-50">
              <button
                className={`flex items-center gap-2 bg-transparent hover:bg-white/5 !px-3 !py-2 rounded-lg text-gray-300 text-sm font-medium transition-all border ${isModelDropdownOpen ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400' : 'border-gray-700 hover:border-gray-600'}`}
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              >
                <div className="flex items-center gap-2">
                  {selectedModels.length > 0 && (
                    <div className="flex -space-x-1">
                      {selectedModels.slice(0, 2).map(m => (
                        <div key={m} className="!w-5 !h-5 rounded-full bg-violet-500 ring-1 ring-[#1e1e1e]" />
                      ))}
                    </div>
                  )}
                  <span className="text-violet-500">{selectedModels.length > 0 ? `${selectedModels.length} Models` : 'Select Model'}</span>
                </div>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" className={`transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''} opacity-70`}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isModelDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsModelDropdownOpen(false)} />
                  <div className="absolute top-full left-0 !mt-2 w-72 bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                    <div className="!px-2 !py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest !mb-1 !ml-1">
                      Available Models
                    </div>
                    {[
                      { id: 'deepseek', value: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3' },
                      { id: 'llama', value: 'meta-llama/Llama-3.2-3B-Instruct', label: 'Llama 3.2' },
                      { id: 'qwen', value: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen Coder' }
                    ].map(model => (
                      <div
                        key={model.id}
                        className={`flex items-start gap-3 !p-2.5 rounded-lg cursor-pointer transition-all ${selectedModels.includes(model.value) ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-white/5 border border-transparent'}`}
                        onClick={() => {
                          if (selectedModels.includes(model.value)) {
                            setSelectedModels(selectedModels.filter(m => m !== model.value));
                          } else {
                            setSelectedModels([...selectedModels, model.value]);
                          }
                        }}
                      >
                        <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedModels.includes(model.value) ? 'bg-indigo-500 border-indigo-500' : 'border-gray-600 bg-transparent'}`}>
                          {selectedModels.includes(model.value) && (
                            <svg width="12" height="12" fill="none" stroke="white" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${selectedModels.includes(model.value) ? 'text-indigo-300' : 'text-gray-200'}`}>{model.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Center: Members List - w-1/3 */}
          <div className="w-1/3 flex justify-center">
            {currentChatId && (
              <div className="flex items-center gap-2">
                {participants.length > 0 && (
                  <div className="flex -space-x-2">
                    {participants.slice(0, 3).map((p, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-[#1e1e1e] bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm" title={p.name}>
                        {p.avatar || p.name.charAt(0)}
                      </div>
                    ))}
                    {participants.length > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-[#1e1e1e] bg-gray-700 flex items-center justify-center text-xs text-white shadow-sm">
                        +{participants.length - 3}
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setIsAddMemberOpen(true)}
                  className="w-8 h-8 rounded-full bg-[#2a2a2a] hover:bg-[#333] flex items-center justify-center text-gray-400 hover:text-white transition-all border border-dashed border-gray-600 hover:border-gray-400"
                  title="Add people"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Right Side: Hamburger - w-1/3 */}
          <div className="w-1/3 flex justify-end">
            <button className="hamburger-menu p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-gray-400 hover:text-white" onClick={toggleSidebar}>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

          </div>
        </div>

        <main className="main">
          <div className="chat-history" ref={chatDisplayRef} onScroll={handleScroll}>
            {isLoadingMore && (
              <div className="flex justify-center p-2">
                <span className="text-xs text-gray-500">Loading history...</span>
              </div>
            )}
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
                  {(() => {
                    const isGroup = participants.length > 0; // Check logic
                    const isOther = turn.userId !== user?.id;
                    const hasSender = !!turn.sender;
                    // console.log(`Turn ${turnIdx}: isGroup=${isGroup} (${participants.length}), isOther=${isOther}, hasSender=${hasSender}`, turn);
                    return null;
                  })()}
                  {participants.length > 0 && turn.userId !== user?.id && turn.sender ? (
                    // Group Chat - Message from Others (Left aligned, Avatar + Name)
                    <div className="flex gap-3 mb-4 w-full justify-start">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm border border-[#333]">
                          {turn.sender.avatar || turn.sender.name.charAt(0)}
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0 items-start max-w-[80%]">
                        <div className="flex items-center gap-2 mb-1 ml-1">
                          <span className="text-xs font-semibold text-gray-400">{turn.sender.name}</span>
                          {turn.timestamp && <span className="text-[10px] text-gray-500">{new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                        </div>
                        <div className="bg-[#ffffffb0] !p-2.5 rounded-2xl text-gray-600 text-sm shadow-lg border border-gray-200 !mb-2">
                          {turn.prompt}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Private Chat OR My Message (Right aligned)
                    <div className="flex w-full justify-end mb-4">
                      <div className={`flex flex-col items-end max-w-[80%] ${!participants.length ? 'w-full !items-start !max-w-full' : ''}`}> {/* Keep full width/left for private chat if desired, but request implies Right for "My" message generally. The user request was specific to LEFT/RIGHT separation. Assuming Right for Me is universal for consistency, but Private chat might be single column. Let's make "My" message Right aligned in group chat, but block in private? 
                      Actually, usually prompts are Right aligned in all chat apps. 
                      Let's stick to Right alignment for "My" message everywhere for consistency effectively. 
                      BUT: existing code had "user-message" which was block. 
                      I will apply Right Align for Group Chat specific context or just generally for "My".
                      The user request image looks like a Group Chat context.
                      I'll default to Right align for "My" messages.
                      */}
                        <div className={`user-message !mb-10 !max-w-full ${participants.length > 0 ? ' !text-right' : ''}`}>
                          {/* Label */}
                          {!participants.length && <div className="user-message-label">You</div>}
                          <div className={`user-message-text ${participants.length > 0 ? 'text-gray-300' : ''}`}>{turn.prompt}</div>
                        </div>
                        {turn.timestamp && participants.length > 0 && <span className="text-[10px] text-gray-500 mt-1 mr-1">{new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                      </div>
                    </div>
                  )}
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
          {participants.length > 0 && typingUsers.length > 0 && (
            <div className="typing-status text-xs text-gray-400 ml-4 mb-2 animate-pulse font-medium">
              {typingUsers.length === 1
                ? `${typingUsers[0].name} is typing...`
                : typingUsers.length === 2
                  ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
                  : `${typingUsers.length} people are typing...`}
            </div>
          )}
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

      {currentChatId && (
        <AddMembersModal
          isOpen={isAddMemberOpen}
          onClose={() => setIsAddMemberOpen(false)}
          sessionId={currentChatId}
          onMemberAdded={(member) => {
            setIsAddMemberOpen(false);
            showToast(`${member.name} added`);
            setParticipants(prev => {
              if (prev.find(p => p._id === member._id)) return prev;
              return [...prev, { ...member }];
            });
            if (socketService.socket) {
              socketService.socket.emit('member_added', { sessionId: currentChatId, member });
            }
          }}
        />
      )
      }
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onLogout={handleLogout}
      />
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <ChatContent />
    </Suspense>
  );
}
