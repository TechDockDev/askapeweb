import { io, Socket } from 'socket.io-client';

import { API_BASE_URL } from '../../config/api';

// Define the socket URL
// Define the socket URL
const SOCKET_URL = 'wss://askape.apeitnow.com';

// Connection options
const SOCKET_OPTIONS = {
    path: '/socket.io',
    transports: ['websocket'], // Force websocket only to avoid polling issues with Nginx
    secure: true,
    rejectUnauthorized: false,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    autoConnect: false // We'll connect manually when component mounts
};

class SocketService {
    public socket: Socket | null = null;
    private static instance: SocketService;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public connect(token?: string) {
        if (this.socket?.connected) return this.socket;

        const options = { ...SOCKET_OPTIONS, auth: { token } };
        this.socket = io(SOCKET_URL, options);

        this.socket.on('connect', () => {
            console.log('✅ Socket connected:', this.socket?.id);
        });

        this.socket.on('connect_error', (err) => {
            console.error('❌ Socket connection error:', err.message);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
        });

        this.socket.connect();
        return this.socket;
    }

    public disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    public getSocket(): Socket | null {
        return this.socket;
    }

    // Helper method to join a session
    public joinSession(sessionId: string, userId?: string, guestId?: string) {
        if (!this.socket) return;
        this.socket.emit('join_session', { sessionId, userId, guestId });
    }

    // Helper method to leave a session
    public leaveSession(sessionId: string) {
        if (!this.socket) return;
        this.socket.emit('leave_session', sessionId);
    }

    // Helper method to send a message
    public sendMessage(sessionId: string, message: string, modelIds: string[], userId?: string, guestId?: string) {
        if (!this.socket) return;
        this.socket.emit('message', { sessionId, message, modelIds, userId, guestId });
    }

    public emitInputChange(sessionId: string, content: string, userId?: string) {
        if (!this.socket) return;
        this.socket.emit('input_change', { sessionId, content, userId });
    }

    public emitTyping(sessionId: string, user: { id: string; name: string }) {
        if (!this.socket) return;
        this.socket.emit('typing_start', { sessionId, user });
    }

    public emitStopTyping(sessionId: string, user: { id: string; name: string }) {
        if (!this.socket) return;
        this.socket.emit('typing_stop', { sessionId, user });
    }
}

export const socketService = SocketService.getInstance();
