# Chat Feature Integration Guide

## Overview
The chat feature has been fully integrated into your AI Life Coach service with LangChain-powered AI responses, vector-based memory retrieval from Qdrant, and persistent conversation storage in PostgreSQL.

## Architecture

### Components

#### 1. **Chat Routes** (`routes/chat.js`)
- Express router module using ES6 imports
- Integrated with your existing service architecture
- Authentication required via JWT tokens
- Uses Prisma for database persistence

#### 2. **LangChain Integration**
- **Model**: OpenAI GPT-4o Mini
- **Temperature**: 0.7 (balanced creativity/consistency)
- **Embeddings**: OpenAI embeddings for semantic search
- **Vector Database**: Qdrant for long-term memory storage

#### 3. **Database Integration**
- **Message Model**: Stores all conversation history (user and AI messages)
- **AIMemory Model**: Stores user context (summary, goals, preferences)
- **Vector Store**: Qdrant collections per user (`user_memories_{userId}`)

## API Endpoints

### 1. POST /api/chat
**Send a chat message and get AI response**

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "message": "What are my goals?" }'
```

**Request:**
```json
{
  "message": "string - user's message"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userMessage": {
      "id": "msg_123",
      "text": "What are my goals?",
      "userId": "user_456",
      "createdAt": "2025-11-04T10:00:00Z"
    },
    "aiResponse": {
      "id": "msg_124",
      "text": "Based on your stored goals...",
      "userId": "user_456",
      "createdAt": "2025-11-04T10:00:05Z"
    }
  }
}
```

### 2. GET /api/chat/history/:userId
**Get conversation history**

```bash
curl -X GET "http://localhost:3001/api/chat/history/user_456?limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Query Parameters:**
- `limit` (optional): Number of messages to retrieve (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "...", "text": "...", "userId": "...", "createdAt": "..." },
    ...
  ]
}
```

### 3. POST /api/chat/memory
**Store long-term memory in vector database**

```bash
curl -X POST http://localhost:3001/api/chat/memory \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "content": "User wants to focus on fitness in 2025" }'
```

**Request:**
```json
{
  "content": "string - memory content to embed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "embedded": true,
    "content": "User wants to focus on fitness in 2025"
  }
}
```

## How It Works

### Chat Flow

1. **User sends message** → `/api/chat`
   - Message saved to database
   - JWT token validated

2. **Context Retrieval**
   - Fetch conversation history (last 10 messages)
   - Retrieve user AI memory (summary, goals, preferences)
   - Query Qdrant for relevant past interactions

3. **AI Response Generation**
   - Build system prompt with user context
   - Send to ChatOpenAI model
   - Model generates contextual response

4. **Response Storage**
   - AI response saved to database
   - Both messages linked to user

5. **Return to Client**
   - Return both user and AI messages

### Memory Layers

#### Layer 1: Conversation History
- **Storage**: PostgreSQL Message table
- **Retrieval**: Last N messages from conversation
- **Use**: Context for immediate chat flow
- **Duration**: Permanent (until deleted)

#### Layer 2: User Context
- **Storage**: PostgreSQL AIMemory table
- **Fields**: summary, goals, preferences (JSON)
- **Use**: Understanding user's broader context
- **Duration**: Until user updates

#### Layer 3: Long-term Memory
- **Storage**: Qdrant vector database
- **Retrieval**: Semantic similarity search
- **Use**: Finding relevant past interactions
- **Duration**: Permanent (until deleted)

## Integration Points

### With Existing Services

#### 1. **Authentication** (`routes/auth.js`)
- All chat endpoints require valid JWT token
- `authenticateToken` middleware validates and attaches user to request
- Uses `req.user.id` to scope conversations

#### 2. **Message Service** (`db/index.js`)
- `messageService.create()` - Store messages
- `messageService.getByUser()` - Retrieve user messages
- `messageService.getConversation()` - Get recent conversation

#### 3. **AI Memory Service** (`db/index.js`)
- `aiMemoryService.getByUser()` - Fetch user context
- Used to populate system prompt with user information

#### 4. **User Context**
- Chat system uses user's stored goals and preferences
- Enables personalized AI responses

## Environment Variables Required

```env
# OpenAI
OPENAI_API_KEY=sk-proj-...

# Qdrant Vector Database
QDRANT_URL=https://...qdrant.io
QDRANT_API_KEY=...

# Service (already configured)
JWT_SECRET=your-secret
DATABASE_URL=postgresql://...
PORT=3001
```

## Error Handling

### Chat Request Errors

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Message is required | Empty or missing message field |
| 401 | Access token required | Missing Authorization header |
| 403 | Invalid or expired token | JWT validation failed |
| 500 | Failed to process chat message | API error or LLM failure |

### Memory Retrieval Failures
- If Qdrant is unavailable, chat continues without vector memory
- Errors logged but don't block conversation
- User context still available from AIMemory table

## Performance Considerations

### Optimization Tips

1. **Conversation History Limit**
   - Default: 10 messages for context
   - Adjust based on token limits
   - LLMs have context window limits (128k for GPT-4o)

2. **Vector Store Queries**
   - Default: 3 similar documents
   - Tune for relevance vs. performance

3. **Message Pagination**
   - Use `limit` parameter in history endpoint
   - Reduces database query time

### Scalability

- **Per-user vector collections**: Reduces search space
- **Message indexing**: Prisma handles efficiently
- **Stateless design**: Scale horizontally behind load balancer

## Testing the Integration

### 1. Register a User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### 2. Update AI Memory
```bash
curl -X POST http://localhost:3001/api/ai-memory/USER_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Software developer interested in fitness",
    "goals": {"2025": ["Run a marathon", "Learn Rust"]},
    "preferences": {"communication_style": "direct"}
  }'
```

### 3. Store Memory
```bash
curl -X POST http://localhost:3001/api/chat/memory \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "User completed 5k run last week"}'
```

### 4. Send Chat Message
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "How can I improve my running performance?"}'
```

### 5. Get Chat History
```bash
curl -X GET http://localhost:3001/api/chat/history/USER_ID \
  -H "Authorization: Bearer TOKEN"
```

## Future Enhancements

1. **Chat Sessions**: Add ability to organize conversations into sessions/threads
2. **Conversation Summarization**: Auto-summarize long conversations
3. **Sentiment Analysis**: Track user sentiment over time
4. **Recommendations**: Generate recommendations based on conversation patterns
5. **Export Conversations**: Allow users to export chat history
6. **Moderation**: Add content moderation for safety
7. **Streaming Responses**: Server-sent events for real-time AI responses
8. **Rate Limiting**: Prevent abuse of chat endpoint

## Troubleshooting

### Issue: "Cannot find module '@langchain/community'"
**Solution**: `npm install @langchain/community`

### Issue: Qdrant connection failed
**Solution**: 
- Check QDRANT_URL and QDRANT_API_KEY in .env
- Verify Qdrant service is running
- Chat will continue without vector memory if Qdrant fails

### Issue: OpenAI API errors
**Solution**:
- Verify OPENAI_API_KEY is correct
- Check API rate limits
- Ensure account has credits

### Issue: Conversation not persisting
**Solution**:
- Verify PostgreSQL connection
- Check DATABASE_URL in .env
- Ensure migrations have run

## Maintenance

### Regular Tasks
- Monitor token usage from OpenAI
- Clean up old vectors in Qdrant
- Archive old conversations if needed
- Review error logs for patterns

### Backup Strategy
- PostgreSQL messages are primary backup
- Export important conversations regularly
- Consider archiving long-term memories

---

**Last Updated**: November 4, 2025
**Status**: Production Ready
