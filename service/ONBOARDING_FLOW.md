# AI Chat Onboarding Flow

## Overview
When a user sends their first chat message, the AI checks if they have an AI Memory profile (summary, goals, preferences). If not, it asks for onboarding details. Once the user replies with their info, the AI parses and saves it automatically.

## Onboarding Flow

### Step 1: First Message (No AI Memory)
**User:** "Hello"

**AI Response:**
```
Thanks for starting a chat! Before we begin, I'd love to learn a bit about you so I can personalize my responses.
Please reply with a short answer containing:
- Who you are (name or short summary)
- 2–4 goals you want to work on (fitness, learning, career, etc.)
- How you'd like to be motivated (e.g. encouraging, supportive, energizing, firm)

Example reply:
My name is Sam. Goals: Run a half marathon; Learn Rust; Improve sleep. Tone: encouraging

You can just write naturally — I'll take care of saving this in your profile.
```

### Step 2: User Provides Profile Info
**User:** "My name is Alex. Goals: Get fit, learn Python, improve focus. Tone: supportive and energizing"

**What Happens:**
- Parser extracts:
  - `summary`: "Alex"
  - `goals`: `["Get fit", "learn Python", "improve focus"]`
  - `preferences.tone`: "supportive and energizing"
- Data saved to AI Memory via `aiMemoryService.upsert()`
- AI responds with confirmation

**AI Response:**
```
Thanks — I saved your profile and preferences. Tell me how I can help today!
```

### Step 3: Subsequent Messages Use Profile
**User:** "How should I start my fitness journey?"

**What Happens:**
- AI retrieves stored profile (summary, goals, tone)
- Includes user context in system prompt
- Tailors responses based on preferences (encouraging tone, awareness of goals)
- Uses cached model selection for cost efficiency

---

## Data Storage

### Saved to AIMemory Table
```json
{
  "userId": "user123",
  "summary": "Alex",
  "goals": {
    "2025": ["Get fit", "learn Python", "improve focus"]
  },
  "preferences": {
    "tone": "supportive and energizing"
  },
  "lastSync": "2025-11-05T00:44:47.192Z",
  "_extractedAt": "2025-11-05T00:44:47.192Z",
  "_extractionConfidence": "high",
  "_extractionWarnings": []
}
```

### Confidence Levels
The parser assigns confidence scores to prevent data loss:

- **HIGH** (Saved immediately): Name + Goals + Tone all detected clearly
- **MEDIUM** (Saved with caution): 2 out of 3 fields detected, or fields are somewhat ambiguous
- **LOW** (Requests clarification): 0-1 field detected, or ambiguous parsing

When confidence is LOW, the AI asks the user to re-format their response for clarity.

### Parser Details
The robust parser in `routes/chat.js` looks for:

1. **Name/Summary Detection (Priority order):**
   - Explicit "My name is X" format (most reliable)
   - "I am X" or "I'm X" only if goals/tone also present in message
   - Avoids fallback to first sentence (prevents "That sounds good" becoming a profile)

2. **Goals Detection (Priority order):**
   - Explicit "Goals:" or "Goal:" field with careful splitting
   - Splits on: `;` (semicolon), `,` (comma), or bullet-list items
   - **Avoids** splitting on "and" to preserve "machine and deep learning" as one goal
   - Looks for goal-indicator verbs: "i want to", "i'd like to", "i'm aiming to"
   - Deduplicates (case-insensitive)
   - Caps at 10 goals max

3. **Tone/Preferences Detection (Priority order):**
   - Explicit "Tone:" field
   - Keyword scan: encouraging, supportive, energizing, firm, gentle, motivating, etc.
   - **Only** scans in tone/preference context to avoid false positives
   - Example: Won't set tone="firm" if user says "I'm firm on this commitment"

### Confidence & Warnings
Each extraction includes:
- `confidence`: 'high' | 'medium' | 'low'
- `warnings`: array of issues found during extraction
  - Example: "Could not extract name/summary explicitly"
  - Example: "Extracted 12 goals - truncating to 10"
  - Example: "No tone/motivation preference detected"

---

## API Endpoints

### Send First Chat (Onboarding Prompt)
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"Hello"}'
```

**Response:** Gets onboarding prompt

### Send Onboarding Reply (Parser Saves Data)
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"My name is Alex. Goals: Get fit, learn Python. Tone: supportive"}'
```

**Response:** Confirmation that profile was saved

### Verify Saved Profile
```bash
curl -X GET http://localhost:3001/api/ai-memory/:userId \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** Full AI Memory including goals, preferences, tone

### Update Profile Manually (Later)
```bash
curl -X PATCH http://localhost:3001/api/ai-memory/:userId/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"tone":"energizing","timezone":"EST"}'
```

---

## Cost Optimization Notes

- **First message (onboarding prompt):** No LLM call — just returns hardcoded prompt
- **Onboarding reply:** Parser extracts data without LLM — saves ~200 tokens per user
- **Subsequent messages:** Use cached responses if exact match, or use cheap model (gpt-3.5-turbo) for simple questions
- **Total savings:** ~80-95% on first-chat cost per user

---

## Robustness & Edge Cases

### ✅ Handled Correctly
- **Multi-word goals:** "Learn machine and deep learning" → stays as one goal (doesn't split on "and")
- **Multiple tones:** "supportive and energizing" → captured as complete string
- **Ambiguous names:** "I'm Sarah, I want..." → extracts "Sarah" (not the full sentence)
- **Duplicate goals:** ["fitness", "Fitness", "GET FIT"] → deduplicated to ["fitness"]
- **Context-aware tone:** "I'm firm about my goals" → doesn't set tone to "firm" (must be in tone context)
- **Too many goals:** >10 goals → truncated with warning
- **Incomplete profile:** Only name + tone → saved as MEDIUM confidence, not discarded
- **False positives:** Random "firm" mentions → ignored unless in tone/preference context

### ⚠️ Clarification Flow (Low Confidence)
If the parser can't extract enough data, user gets:
```
I caught some profile info, but I want to make sure I get it right. Could you re-phrase using this format?

My name is [your name]. Goals: [goal 1]; [goal 2]; [goal 3]. Tone: [encouraging/supportive/energizing/firm/etc].

Example: My name is Alex. Goals: Run a half-marathon; Learn Python; Improve sleep. Tone: supportive
```

### 📊 Extraction Logging
Every onboarding extraction logs:
```
📋 Onboarding parse result: {
  summary: "Alex",
  goalsCount: 3,
  tone: "supportive",
  confidence: "high",
  warnings: "none"
}
```

Service logs show exactly what was extracted, making debugging easy.

### 🔒 Data Validation
- Filters out invalid entries (goals < 3 chars or > 100 chars)
- Skips empty/null values
- Caps goals at 10 max
- Trims all whitespace
- Validates tone against known preferences

---

## Future Enhancements

- [ ] Allow users to update profile via `/api/ai-memory/:userId/edit`
- [ ] Multi-step onboarding wizard (ask one question at a time)
- [ ] LLM-powered profile extraction (for richer summaries)
- [ ] Annual re-onboarding reminder
- [ ] Profile completion % tracker
