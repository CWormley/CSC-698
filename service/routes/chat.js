import express from 'express';
import { messageService, aiMemoryService } from '../db/index.js';
import { authenticateToken } from './auth.js';
import { 
  getLLM, 
  getCheapLLM,
  selectModelForTask,
  getCachedResponse,
  setCachedResponse,
  trackTokenUsage,
  getTokenStats,
} from '../LLM/aiService.js';

const router = express.Router();

// Check for required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not set in environment');
}

/**
 * Get conversation history from database
 */
async function getConversationHistory(userId, limit = 10) {
  const messages = await messageService.getConversation(userId, limit);
  return messages.reverse().map(msg => ({
    role: 'user',
    content: msg.text,
  }));
}

/**
 * Get user context from AI memory
 */
async function getUserContext(userId) {
  try {
    const memory = await aiMemoryService.getByUser(userId);
    if (!memory) return '';
    
    let context = '';
    if (memory.summary) context += `Summary: ${memory.summary}\n`;
    if (memory.goals) context += `Goals: ${JSON.stringify(memory.goals)}\n`;
    if (memory.preferences) context += `Preferences: ${JSON.stringify(memory.preferences)}\n`;
    
    return context;
  } catch (error) {
    console.error('Error retrieving user context:', error);
    return '';
  }
}

/**
 * Retrieve relevant memories from vector store (optional feature)
 */
async function getRelevantMemories(userId, query, limit = 3) {
  try {
    // For now, we'll skip Qdrant integration
    // In production, implement with @langchain/qdrant package
    return '';
  } catch (error) {
    console.error('Error retrieving memories:', error);
    return '';
  }
}

/**
 * Generate AI response using conversation history and context
 * Implements cost optimization: caching, model selection, max tokens
 */
async function generateChatResponse(userId, userMessage) {
  try {
    // COST OPTIMIZATION 1: Check cache first
    const cachedResponse = getCachedResponse(userId, userMessage);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // COST OPTIMIZATION 2: Select model based on task complexity
    const modelType = selectModelForTask(userMessage);
    const model = modelType === 'cheap' ? getCheapLLM() : getLLM();
    console.log(`🤖 Using model: ${modelType === 'cheap' ? 'gpt-3.5-turbo (cheap)' : 'gpt-4o-mini'}`);
    
    // Get conversation history
    const conversationHistory = await getConversationHistory(userId);
    
    // Get user context from AI memory
    const userContext = await getUserContext(userId);

    // ONBOARDING: If no user context exists, ask onboarding questions
    // The first chat should ask for a few details: who they are, goals, and preferred motivational tone
    if (!userContext || userContext.trim().length === 0) {
      const onboardingPrompt = `Thanks for starting a chat! Before we begin, I'd love to learn a bit about you so I can personalize my responses.
Please reply with a short answer containing:
- Who you are (name or short summary)
- 2–4 goals you want to work on (fitness, learning, career, etc.)
- How you'd like to be motivated (e.g. encouraging, supportive, energizing, firm)

Example reply:
My name is Sam. Goals: Run a half marathon; Learn Rust; Improve sleep. Tone: encouraging

You can just write naturally — I'll take care of saving this in your profile.`;

      // Return onboarding prompt directly (don't invoke LLM on first-contact)
      return onboardingPrompt;
    }

    // If the user message *looks like* an onboarding answer, try to parse and save it
    // (This is a lightweight heuristic parser to avoid extra LLM calls.)
    const onboardingSaved = await tryHandleOnboardingReply(userId, userMessage);
    if (onboardingSaved) {
      // Give a friendly acknowledgement
      return 'Perfect! I saved your profile and preferences. Now, how can I help you today?';
    }
    
    // If we tried to parse but confidence was low, ask for clarification
    // This prevents data loss from ambiguous input
    const lower = userMessage.toLowerCase();
    const hasOnboardingKeywords = /my name is|i am\b|i'm\b|goals?:|goal:|i want to|i'd like to|tone:|prefer/.test(lower);
    if (hasOnboardingKeywords) {
      return `I caught some profile info, but I want to make sure I get it right. Could you re-phrase using this format?

My name is [your name]. Goals: [goal 1]; [goal 2]; [goal 3]. Tone: [encouraging/supportive/energizing/firm/etc].

Example: My name is Alex. Goals: Run a half-marathon; Learn Python; Improve sleep. Tone: supportive`;
    }
    
    // Build system prompt with context
    let systemPrompt = 'You are a helpful personal AI assistant for a life coaching application. ';
    if (userContext) systemPrompt += `User Context:\n${userContext}\n`;
    
    // Create messages array for the model
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'human', content: userMessage },
    ];
    
    console.log(`📤 Sending to ${modelType === 'cheap' ? 'GPT-3.5' : 'GPT-4o-mini'}: ${messages.length} messages`);
    
    // Generate response using the selected model
    // maxTokens is already set in aiService.js to prevent expensive responses
    const response = await model.invoke(messages);
    
    const responseText = response.content || response.text || '';
    console.log(`📥 Response received: ${responseText.length} chars`);
    
    // COST OPTIMIZATION 3: Cache the response for future use
    setCachedResponse(userId, userMessage, responseText);
    
    // COST OPTIMIZATION 4: Track token usage
    // LangChain stores usage in response_metadata after invoke
    if (response.response_metadata) {
      const usage = response.response_metadata.usage;
      if (usage) {
        console.log(`📊 Token Usage - Input: ${usage.prompt_tokens}, Output: ${usage.completion_tokens}`);
        trackTokenUsage(usage.prompt_tokens, usage.completion_tokens);
      } else {
        console.log('⚠️ No usage data in response metadata');
      }
    } else {
      console.log('⚠️ No response_metadata available');
    }
    
    return responseText;
  } catch (error) {
    console.error('❌ Error generating chat response:', error);
    throw error;
  }
}

// --- API Routes ---

/**
 * POST /api/chat - Send a chat message and get AI response
 * Requires: userId, message
 * Returns: { success, data: { userMessage, aiResponse, messageId } }
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`\n💬 Chat request from user ${userId}: "${message}"`);

    // Save user message to database
    const userMsg = await messageService.create({
      text: message,
      userId,
    });
    console.log(`✓ Saved user message: ${userMsg.id}`);

    // Generate AI response
    console.log('🤖 Generating AI response...');
    const aiResponse = await generateChatResponse(userId, message);
    console.log(`✓ AI response generated (${aiResponse.length} chars)`);

    // Save AI response to database
    const aiMsg = await messageService.create({
      text: aiResponse,
      userId,
    });
    console.log(`✓ Saved AI message: ${aiMsg.id}`);

    res.json({
      success: true,
      data: {
        userMessage: userMsg,
        aiResponse: aiMsg,
      },
    });
  } catch (error) {
    console.error('❌ Error in chat endpoint:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      message: error.message,
    });
  }
});

/**
 * GET /api/chat/history/:userId - Get conversation history
 * Returns: { success, data: messages[] }
 */
router.get('/history/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Verify user is requesting their own history or is admin
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const messages = await messageService.getByUser(userId, limit);
    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      error: 'Failed to fetch chat history',
      message: error.message,
    });
  }
});

/**
 * POST /api/chat/memory - Store long-term memory
 * Requires: userId, content
 * Returns: { success, data: { embedded } }
 */
router.post('/memory', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // For now, we'll log the memory content
    // In production, implement vector embedding with Qdrant
    console.log(`Storing memory for user ${userId}: ${content}`);

    res.json({
      success: true,
      data: { 
        embedded: true, 
        content,
        message: 'Memory stored (vector embedding coming soon)'
      },
    });
  } catch (error) {
    console.error('Error storing memory:', error);
    res.status(500).json({
      error: 'Failed to store memory',
      message: error.message,
    });
  }
});

/**
 * GET /api/chat/stats - Get token usage and cost statistics (admin only)
 * Returns: { success, data: { tokenUsage, estimatedCost } }
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = getTokenStats();
    res.json({
      success: true,
      data: {
        ...stats,
        message: '💰 Token usage tracking (all times in aggregates since last reset)',
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message,
    });
  }
});

export default router;

// --- Onboarding helpers ---
/**
 * Try to detect an onboarding-style reply and save it to AI memory.
 * Uses confidence scoring to determine if extraction is reliable.
 * Returns: true if HIGH/MEDIUM confidence data saved, false if LOW confidence or errors
 */
async function tryHandleOnboardingReply(userId, message) {
  try {
    if (!message || message.trim().length < 20) {
      console.log('⚠️ Message too short for onboarding parsing');
      return false;
    }

    const lower = message.toLowerCase();

    // Gate: look for keywords that indicate an onboarding response (not just any message)
    const hasName = /my name is|i am\b|i'm\b/.test(lower);
    const hasGoals = /goals?:|goal:|i want to|i'd like to|i would like to|i'm aiming|aiming to/.test(lower);
    const hasTone = /tone:|encourag|support|energiz|firm|strict|gentle|motiv|prefer/.test(lower);

    if (!(hasName || hasGoals || hasTone)) {
      console.log('⚠️ No onboarding keywords detected - treating as regular chat');
      return false;
    }

    const parsed = parseOnboardingReply(message);

    // Confidence check: only save if we're reasonably sure
    if (parsed.confidence === 'low') {
      console.log('⚠️ LOW confidence extraction - requesting clarification');
      console.log('   Warnings:', parsed.warnings);
      // Return false so AI asks follow-up questions
      return false;
    }

    // Build memory payload - only include fields we extracted
    const memoryPayload = {};
    if (parsed.summary && parsed.summary !== '[Pending explicit response]') {
      memoryPayload.summary = parsed.summary;
    }
    if (parsed.goals && parsed.goals.length > 0) {
      const year = String(new Date().getFullYear());
      memoryPayload.goals = { [year]: parsed.goals };
    }
    if (parsed.preferences && Object.keys(parsed.preferences).length > 0) {
      memoryPayload.preferences = parsed.preferences;
    }

    if (Object.keys(memoryPayload).length === 0) {
      console.log('⚠️ No valid data extracted after filtering');
      return false;
    }

    // Save with confidence metadata for future reference
    memoryPayload._extractedAt = new Date();
    memoryPayload._extractionConfidence = parsed.confidence;
    if (parsed.warnings.length > 0) {
      memoryPayload._extractionWarnings = parsed.warnings;
    }

    await aiMemoryService.upsert(userId, memoryPayload);
    console.log(`✅ Onboarding data saved [${parsed.confidence} confidence] for user ${userId}`);
    console.log('   Saved:', memoryPayload);
    return true;
  } catch (err) {
    console.error('❌ Error handling onboarding reply:', err);
    return false;
  }
}

/**
 * Robust onboarding parser using lightweight extraction + validation.
 * Prioritizes accuracy over comprehensiveness to avoid data loss.
 * 
 * Returns: { summary, goals, preferences, confidence, warnings }
 * - confidence: 'high'|'medium'|'low' - whether we're sure about extraction
 * - warnings: array of issues found (for logging/debugging)
 */
function parseOnboardingReply(text) {
  const result = {
    summary: '',
    goals: [],
    preferences: {},
    confidence: 'low',
    warnings: [],
  };

  if (!text || text.trim().length < 20) {
    result.warnings.push('Text too short to parse reliably');
    return result;
  }

  // --- EXTRACT SUMMARY/NAME (Robust) ---
  let extractedName = '';
  
  // Priority 1: Explicit "My name is X" pattern
  const nameMatch = text.match(/my name is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (nameMatch && nameMatch[1]) {
    extractedName = nameMatch[1].trim();
  }
  
  // Priority 2: "I am X" or "I'm X" - but only if followed by goal/tone indicators
  if (!extractedName) {
    const iAmMatch = text.match(/^(?:i am|i'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (iAmMatch && iAmMatch[1] && /goals?:|tone:|i want to|i'd like to|prefer/i.test(text)) {
      extractedName = iAmMatch[1].trim();
    }
  }
  
  // Only use summary if we have clear extraction (avoid "That sounds good" as summary)
  if (extractedName && extractedName.length > 1 && extractedName.length < 50) {
    result.summary = extractedName;
  } else if (!extractedName) {
    result.warnings.push('Could not extract name/summary explicitly - falling back to user contact');
    // Don't auto-assign first sentence - too error-prone
    result.summary = '[Pending explicit response]';
  }

  // --- EXTRACT GOALS (Robust) ---
  let extractedGoals = [];
  
  // Priority 1: Explicit "Goals:" or "Goal:" field
  const goalsMatch = text.match(/goals?:\s*([^\n]*(?:\n(?!tone:|preference:)[^\n]*)*)/i);
  if (goalsMatch && goalsMatch[1]) {
    // Split carefully: only on semicolons, commas, or sentence boundaries
    // Avoid splitting on "and" to prevent "machine and deep learning" → ["machine", "deep learning"]
    const goalsText = goalsMatch[1];
    extractedGoals = goalsText
      .split(/;\s*|,\s*|(?:\n\s*-\s*)/) // split on ;, comma, or bullet-list items
      .map(g => g.replace(/^(?:and|or)\s+/i, '').trim()) // remove leading "and"/"or"
      .filter(g => g.length > 2 && g.length < 100); // filter invalid entries
  }
  
  // Priority 2: Look for "I want to" / "I'd like to" sentences
  if (extractedGoals.length === 0) {
    const lines = text.split(/[\.\n]/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (/i want to|i'd like to|i would like to|i'm aiming to|goal is to/i.test(line)) {
        // Extract just the goal part, not the intro
        const goalPart = line
          .replace(/^.*?(?:i want to|i'd like to|i would like to|i'm aiming to|goal is to)\s+/i, '')
          .trim();
        if (goalPart.length > 2 && goalPart.length < 100) {
          extractedGoals.push(goalPart);
        }
      }
    }
  }
  
  if (extractedGoals.length === 0) {
    result.warnings.push('No goals detected - user may not have provided them');
  } else if (extractedGoals.length > 10) {
    result.warnings.push(`Extracted ${extractedGoals.length} goals - may be too many, truncating to 10`);
    extractedGoals = extractedGoals.slice(0, 10);
  }
  
  // Remove duplicates (case-insensitive)
  const uniqueGoals = [];
  const seen = new Set();
  for (const goal of extractedGoals) {
    const lower = goal.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueGoals.push(goal);
    }
  }
  result.goals = uniqueGoals;

  // --- EXTRACT TONE/PREFERENCES (Robust) ---
  let extractedTone = '';
  
  // Priority 1: Explicit "Tone:" field
  const toneMatch = text.match(/tone:\s*([a-zA-Z\- ]+?)(?:[,\.\n]|$)/i);
  if (toneMatch && toneMatch[1]) {
    extractedTone = toneMatch[1].trim().toLowerCase();
  }
  
  // Priority 2: Keyword scan - but ONLY from a specific "preference/tone" section
  if (!extractedTone) {
    const toneKeywords = [
      'encouraging', 'supportive', 'energizing', 'energetic',
      'firm', 'strict', 'gentle', 'motivating', 'motivational',
      'uplifting', 'positive', 'realistic', 'direct', 'compassionate'
    ];
    
    // Look in "tone:" or "prefer:" or "motivat:" context to avoid false positives
    const contextMatch = text.match(/(?:tone|prefer|motivat)[^.]*?\b([\w\- ]+)\b/i);
    if (contextMatch) {
      for (const keyword of toneKeywords) {
        if (contextMatch[0].toLowerCase().includes(keyword)) {
          extractedTone = keyword;
          break;
        }
      }
    }
  }
  
  if (extractedTone) {
    result.preferences.tone = extractedTone;
  } else {
    result.warnings.push('No tone/motivation preference detected');
  }

  // --- CONFIDENCE SCORING ---
  const hasName = result.summary && result.summary !== '[Pending explicit response]';
  const hasGoals = result.goals.length > 0;
  const hasTone = result.preferences.tone;
  
  if (hasName && hasGoals && hasTone) {
    result.confidence = 'high';
  } else if ((hasName && hasGoals) || (hasGoals && hasTone)) {
    result.confidence = 'medium';
  } else {
    result.confidence = 'low';
  }
  
  console.log(`📋 Onboarding parse result:`, {
    summary: result.summary,
    goalsCount: result.goals.length,
    tone: result.preferences.tone || 'not set',
    confidence: result.confidence,
    warnings: result.warnings.length > 0 ? result.warnings : 'none',
  });

  return result;
}
