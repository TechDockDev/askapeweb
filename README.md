# AskApe Documentation

## 1. Project Overview
AskApe is a scalable, real-time AI chat platform built with the MERN stack (MongoDB, Express, React/Next.js, Node.js). It orchestrates interaction with multiple LLMs simultaneously, supports collaborative sessions, and manages subscriptions via Razorpay.

---

## 2. Infrastructure & Architecture

### Backend (`/backend`)
- **Server:** Node.js with Express.
- **Real-time:** Socket.IO for event-driven bi-directional communication.
- **Database:** MongoDB for persistent storage of users, sessions, and payments.
- **Authentication:** JWT-based stateless authentication.
- **AI Integration:** Direct integration with HuggingFace/External Model APIs for streaming responses.

### User Endpoint (`/userPanel`)
- **Framework:** Next.js 13 (App Router) for server-side rendering and static generation.
- **State Management:** React Hooks (`useState`, `useReducer`) + Socket Service Singleton.
- **Styling:** Tailwind CSS with a custom theme provider (`ThemeProvider`).

### Admin Dashboard (`/adminPanel`)
- **Framework:** Vite + React (SPA).
- **Communication:** Axios for REST API consumption.
- **Charts:** Recharts for data visualization.

---

## 3. Database Schema (MongoDB Mongoose)

### **User**
| Field | Type | Description |
|-------|------|-------------|
| `name` | String | User's full name. |
| `email` | String | Unique email address (sparse index). |
| `password` | String | Hashed password (if email/pass auth). |
| `googleId` | String | OAuth ID for Google login. |
| `role` | Enum | `'user'`, `'admin'`. Default: `'user'`. |
| `plan` | Enum | `'free'`, `'pro'`, `'pro_plus'`, `'enterprise'`. |
| `tokenBalance` | Number | Remaining tokens for AI generation. |
| `apiKey` | String | Personal API key for external access. |

### **Session (Chat)**
| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | String | Unique UUID for the chat session. |
| `userId` | String | ID of the session owner (creator). |
| `participants` | Ref[] | Array of `User` ObjectIds for collaborators. |
| `modelIds` | String[] | List of AI models active in this chat. |
| `isActive` | Boolean | Soft delete flag. |

### **Plan**
| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Display name (e.g., "Pro Plan"). |
| `slug` | String | Unique identifier (e.g., `pro`). |
| `price` | Number | Monthly cost. |
| `accessLimits` | Object | Limits: `{ apiCalls: Number, maxTokens: Number }`. |

### **Payment**
| Field | Type | Description |
|-------|------|-------------|
| `userId` | Ref | Link to `User`. |
| `amount` | Number | Transaction amount. |
| `status` | Enum | `'pending'`, `'completed'`, `'failed'`. |
| `razorpayPaymentId` | String | Transaction ID from payment gateway. |

---

## 4. API Documentation (REST)

### **Authentication**
- `POST /api/auth/google`: Authenticate with Google ID token.
- `GET /api/auth/me`: Retrieve current user profile (Protected).

### **Chat Management**
- `GET /api/chat/sessions`: List all chat sessions for a user.
- `GET /api/chat/history/:sessionId`: Get message history (linear list).
- `DELETE /api/chat/sessions/:sessionId`: Soft delete a session.
- `PATCH /api/chat/sessions/:sessionId`: Update session title.
- `POST /api/chat/sessions/:sessionId/participants`: Add a user as a collaborator.

### **Payments**
- `GET /api/payments/plans`: Public list of active subscription plans.
- `GET /api/payments/history`: User's billing history.
- `POST /api/payments/create-subscription`: Initialize Razorpay subscription.
- `POST /api/payments/verify-subscription`: Verify signature and activate plan.

---

## 5. Real-time Gateway (Socket.IO)

The application relies heavily on WebSockets for the chat experience.

### **Client -> Server Events**
| Event | Payload | Description |
|-------|---------|-------------|
| `join_session` | `{ sessionId, userId, guestId }` | Handshake to enter a chat room. |
| `message` | `{ sessionId, message, modelIds, ... }` | User sends a prompt to selected models. |
| `fetch_history` | `{ sessionId, beforeId, limit }` | Pagination request for older messages. |
| `input_change` | `{ sessionId, content }` | Broadcast real-time typing content (collaborative). |
| `typing_start` | `{ sessionId, user }` | Signal typing indicator. |

### **Server -> Client Events**
| Event | Payload | Description |
|-------|---------|-------------|
| `session_joined` | `{ sessionId, participants, ... }` | Confirmation of room entry. |
| `session_history` | `[Message]` | Initial batch of recent messages. |
| `message_chunk` | `{ modelId, chunk, fullContent }` | Streaming token from AI model. |
| `model_streaming_complete` | `{ modelId, content, tokensUsed }` | Final payload for a model response. |
| `system_notification` | `{ type, message }` | Alerts (e.g., "User joined"). |
| `error` | `{ message }` | General error handling. |

---

## 6. Frontend Services

### **SocketService (Singleton)**
Located in `userPanel/src/app/services/socket.ts`.
- Manages the single WebSocket connection using the Singleton pattern.
- Provides public methods (`joinSession`, `sendMessage`) to decouple React components from socket logic.
- Auto-reconnection logic enabled.

### **ThemeProvider**
Located in `userPanel/src/app/providers/ThemeProvider`.
- Uses React Context to manage `dark` / `light` mode.
- Persists preference in `localStorage`.

---

## 7. Configuration & Environment

### **Backend (`.env`)**
- `PORT`: Server port (default 5000).
- `MONGO_URI`: MongoDB connection string.
- `JWT_SECRET`: Secret key for signing tokens.
- `RAZORPAY_KEY_ID`: Public key for payments.
- `RAZORPAY_KEY_SECRET`: Secret key for verifying payments.
- `HUGGINGFACE_API_KEY`: Key for accessing inference API.

### **Frontend**
- `API_BASE_URL`: Configured in `config/api.js` (User Panel) and `config.js` (Admin Panel). Defaults to `http://localhost:5000/api`.

---

## 8. Development Workflows

### **Running Locally**
1. **Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
2. **User Panel:**
   ```bash
   cd userPanel
   npm install
   npm run dev
   ```
3. **Admin Panel:**
   ```bash
   cd adminPanel
   npm install
   npm run dev
   ```

### **Adding a New AI Model**
Update `backend/config/constants.js` to include the new model ID and configuration. The frontend will automatically fetch available models.
