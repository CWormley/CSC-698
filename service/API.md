# API Endpoints

Base URL: `http://localhost:5000/api`

## Users

### Create User
```http
POST /api/users
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe"
}
```

### Get User by ID
```http
GET /api/users/:userId
```

### Get User by Email
```http
GET /api/users/email/:email
```

### Update User
```http
PUT /api/users/:userId
Content-Type: application/json

{
  "name": "Updated Name"
}
```

### Delete User
```http
DELETE /api/users/:userId
```

## Messages

### Create Message
```http
POST /api/messages
Content-Type: application/json

{
  "text": "Hello AI coach!",
  "userId": "user-id-here"
}
```

### Get User Messages
```http
GET /api/messages/user/:userId?limit=50
```

### Get Recent Conversation
```http
GET /api/messages/conversation/:userId?limit=10
```

### Delete Message
```http
DELETE /api/messages/:messageId
```

## Reminders

### Create Reminder
```http
POST /api/reminders
Content-Type: application/json

{
  "userId": "user-id-here",
  "title": "Go to gym",
  "dueDate": "2024-10-09T18:00:00Z",
  "repeatType": "WEEKLY",
  "interval": 1
}
```

### Get User Reminders
```http
GET /api/reminders/user/:userId?includeCompleted=false
```

### Get Upcoming Reminders
```http
GET /api/reminders/upcoming/:userId?days=7
```

### Mark Reminder Complete
```http
PATCH /api/reminders/:reminderId/complete
```

### Update Reminder
```http
PUT /api/reminders/:reminderId
Content-Type: application/json

{
  "title": "Updated reminder",
  "dueDate": "2024-10-10T18:00:00Z"
}
```

### Delete Reminder
```http
DELETE /api/reminders/:reminderId
```

## AI Memory

### Get AI Memory
```http
GET /api/ai-memory/:userId
```

### Create/Update AI Memory
```http
POST /api/ai-memory/:userId
Content-Type: application/json

{
  "summary": "User prefers morning workouts and healthy cooking",
  "goals": {
    "fitness": "Exercise 3x per week",
    "learning": "Learn to cook healthy meals"
  },
  "preferences": {
    "reminderTime": "morning",
    "motivationStyle": "encouraging"
  }
}
```

### Update Goals Only
```http
PATCH /api/ai-memory/:userId/goals
Content-Type: application/json

{
  "goals": {
    "fitness": "Exercise 5x per week",
    "diet": "Eat more vegetables"
  }
}
```

### Update Preferences Only
```http
PATCH /api/ai-memory/:userId/preferences
Content-Type: application/json

{
  "preferences": {
    "reminderTime": "evening",
    "motivationStyle": "direct"
  }
}
```

### Delete AI Memory
```http
DELETE /api/ai-memory/:userId
```

## Response Format

All endpoints return responses in this format:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message",
  "message": "Detailed error description (optional)"
}
```

## Testing Commands

### Create a user
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'
```

### Get user
```bash
curl http://localhost:5000/api/users/USER_ID_HERE
```

### Create a message
```bash
curl -X POST http://localhost:5000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello AI!","userId":"USER_ID_HERE"}'
```
