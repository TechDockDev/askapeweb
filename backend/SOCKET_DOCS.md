# Backend Socket Documentation

This document outlines the Socket.IO events used in the AskApe backend for real-time communication, primarily for chat functionality.

## Connection Details

-   **URL**: `ws://<backend_url>` (e.g., `ws://localhost:3001` or production URL)
-   **Transports**: `['websocket', 'polling']`
-   **Path**: Default Socket.IO path (`/socket.io/`)

## Authentication & Identity

The socket connection handles both authenticated users and guest users.
-   **Authenticated Users**: Identify via `userId`.
-   **Guest Users**: Identify via `guestId`. If no `guestId` is provided, the server generates one and returns it.

---

## Client -> Server Events

### `join_session`
Joins a specific chat session room.

**Payload:**
```json
{
  "sessionId": "string (UUID)",
  "userId": "string (optional)",
  "guestId": "string (optional)"
}
```

### `message`
Sends a user message to the server to process and generate AI responses.

**Payload:**
```json
{
  "sessionId": "string (UUID)",
  "message": "string (User's query)",
  "modelIds": ["string"], // Array of model IDs to query (optional, defaults to all default models)
  "userId": "string (optional)",
  "guestId": "string (optional)"
}
```
*Note: `modelIds` correspond to the IDs in `AVAILABLE_MODELS` (e.g., `deepseek-ai/DeepSeek-V3`).*

---

## Server -> Client Events

### `session_joined`
Emitted after successfully joining a session.

**Payload:**
```json
{
  "sessionId": "string",
  "guestId": "string", // Use this for future requests if user is a guest
  "usingDatabase": boolean
}
```

### `session_history`
Emitted immediately after joining to provide past messages for the session.

**Payload:**
```json
[
  {
    "id": "string (messageId)",
    "role": "USER" | "AI",
    "content": "string",
    "tokensUsed": number,
    "aiResponses": [ // If role is AI
       {
         "modelId": "string",
         "content": "string",
         "tokensUsed": number,
         "createdAt": "date string"
       }
    ],
    "createdAt": "date string"
  }
]
```

### `message_saved`
Acknowledges that the user's message has been received and stored.

**Payload:**
```json
{
  "id": "string (messageId)",
  "stored": "mongodb" | "memory" | "failed",
  "error": "string (optional)"
}
```

### `streaming_started`
Indicates that the server has started processing the request and will begin streaming.

**Payload:**
```json
{
  "sessionId": "string",
  "messageId": "string (UUID for the upcoming AI response)",
  "models": [
    { "id": "string", "name": "string" }
  ]
}
```

### `model_streaming_start`
Indicates a specific model has started generating a response.

**Payload:**
```json
{
  "modelId": "string",
  "modelName": "string"
}
```

### `message_chunk`
Contains a partial text chunk from a specific model.

**Payload:**
```json
{
  "modelId": "string",
  "modelName": "string",
  "chunk": "string", // The new text fragment
  "fullContent": "string", // The accumulated text so far
  "chunkIndex": number
}
```

### `model_streaming_complete`
Indicates a specific model has finished generating its response.

**Payload:**
```json
{
  "modelId": "string",
  "modelName": "string",
  "id": "string (response ID)",
  "content": "string (Final complete text)",
  "tokensUsed": number,
  "chunkCount": number
}
```

### `model_error`
Emitted if a specific model fails to generate a response.

**Payload:**
```json
{
  "modelId": "string",
  "modelName": "string",
  "error": "string"
}
```

### `all_responses_complete`
Emitted when all selected models have finished (or failed).

**Payload:**
```json
{
  "sessionId": "string",
  "modelsCompleted": number
}
```

### `error`
General error event.

**Payload:**
```json
{
  "type": "string (optional)",
  "message": "string"
}
```
