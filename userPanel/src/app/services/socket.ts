import { io, Socket } from 'socket.io-client';

import { API_BASE_URL } from '../../config/api';

// Define the socket URL
const SOCKET_URL = API_BASE_URL;

// Connection options
const SOCKET_OPTIONS = {
    transports: ['websocket', 'polling'],
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

    // Helper method to send a message
    public sendMessage(sessionId: string, message: string, modelIds: string[], userId?: string, guestId?: string) {
        if (!this.socket) return;
        this.socket.emit('message', { sessionId, message, modelIds, userId, guestId });
    }
}

export const socketService = SocketService.getInstance();
