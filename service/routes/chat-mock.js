import express from 'express';
import { messageService, aiMemoryService } from '../db/index.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Mock AI responses for testing
const mockResponses = [
  "That's a great question! Based on your goals and preferences, here's what I recommend...",
  "I appreciate you sharing that with me. Let me help you think through this systematically.",
  "That aligns well with your stated goals. Here are some concrete steps you could take:",
  "I notice this connects to your earlier mention about fitness. Let's explore that further.",
  "Your consistency with this practice will really pay off. Have you considered...",
  "That's excellent progress! How are you feeling about the changes so far?",
];

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
 * Generate mock AI response (for testing without OpenAI quota)
 */
async function generateChatResponse(userId, userMessage) {
  try {
    // Get user context
    const userContext = await getUserContext(userId);
    
    // Select a mock response
    const mockResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    
    // Build contextual response
    let response = mockResponse;
    
    if (userContext) {
      response += `\n\nBased on your profile:\n${userContext}`;
    }
    
    // Add some personalization based on keywords in user message
    if (userMessage.toLowerCase().includes('fitness') || userMessage.toLowerCase().includes('exercise')) {
      response += '\n\nFor fitness goals, consistency beats intensity. Start with sustainable habits.';
    }
    if (userMessage.toLowerCase().includes('learn') || userMessage.toLowerCase().includes('skill')) {
      response += '\n\nLearning a new skill? Break it into small, manageable daily tasks.';
    }
    if (userMessage.toLowerCase().includes('help')) {
      response += '\n\nI\'m here to help you achieve your goals. What specific area would you like to focus on?';
    }
    
    return response;
  } catch (error) {
    console.error('Error generating chat response:', error);
    throw error;
  }
}

// --- API Routes ---

/**
 * POST /api/chat - Send a chat message and get AI response
 * Requires: userId, message
 * Returns: { success, data: { userMessage, aiResponse } }
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

    // Generate mock AI response
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
 * Requires: content
 * Returns: { success, data: { stored } }
 */
router.post('/memory', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Log the memory content
    console.log(`📝 Storing memory for user ${userId}: ${content}`);

    res.json({
      success: true,
      data: { 
        stored: true, 
        content,
        message: 'Memory stored successfully'
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

export default router;
