import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";

// Singleton LLM instances - shared across entire application
let llmInstance = null;
let llmCheapInstance = null;
let embeddingsInstance = null;

// Response cache for cost optimization
const responseCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Track token usage for monitoring
export const tokenUsage = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCost: 0,
  lastReset: new Date(),
};

/**
 * Get or create the main LLM instance (gpt-4o-mini)
 * COST: $0.15 per 1M input tokens, $0.60 per 1M output tokens
 */
export function getLLM(options = {}) {
  if (!llmInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    llmInstance = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: options.temperature ?? 0, // 0 = deterministic (better for caching)
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 2,
      maxTokens: 500, // COST: Prevent expensive runaway responses
      topP: 0.9,
    });
  }
  return llmInstance;
}

/**
 * Get cheaper LLM for simple tasks (gpt-3.5-turbo)
 * COST: 10x cheaper than gpt-4o-mini
 * Use for: keyword extraction, classification, simple Q&A
 */
export function getCheapLLM(options = {}) {
  if (!llmCheapInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    llmCheapInstance = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: options.temperature ?? 0,
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 2,
      maxTokens: 300, // COST: More restricted than main model
      topP: 0.9,
    });
  }
  return llmCheapInstance;
}

/**
 * Get or create the embeddings instance
 */
export function getEmbeddings() {
  if (!embeddingsInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    embeddingsInstance = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return embeddingsInstance;
}

/**
 * Check cache for existing response
 * SAVES: 100% of tokens if hit
 */
export function getCachedResponse(userId, message) {
  const cacheKey = `${userId}:${hashMessage(message)}`;
  const cached = responseCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('✅ Cache HIT - Response retrieved from cache');
    return cached.response;
  }
  
  if (cached) {
    responseCache.delete(cacheKey); // Remove expired cache
  }
  
  return null;
}

/**
 * Store response in cache
 */
export function setCachedResponse(userId, message, response) {
  const cacheKey = `${userId}:${hashMessage(message)}`;
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now(),
  });
}

/**
 * Simple hash for message deduplication
 */
function hashMessage(message) {
  return message
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .slice(0, 10) // First 10 words as hash
    .join(':');
}

/**
 * Determine which model to use based on task
 * SAVES: 80% on simple tasks by using cheaper model
 */
export function selectModelForTask(message) {
  // Simple keyword-based classification
  const lowerMessage = message.toLowerCase();
  
  // Use cheap model for simple tasks
  if (
    lowerMessage.includes('what') && lowerMessage.length < 100 ||
    lowerMessage.includes('list') ||
    lowerMessage.includes('define') ||
    lowerMessage.includes('summarize')
  ) {
    return 'cheap'; // gpt-3.5-turbo
  }
  
  // Use main model for complex reasoning
  return 'main'; // gpt-4o-mini
}

/**
 * Track token usage for cost monitoring
 */
export function trackTokenUsage(inputTokens, outputTokens) {
  tokenUsage.totalInputTokens += inputTokens;
  tokenUsage.totalOutputTokens += outputTokens;
  
  // gpt-4o-mini pricing: $0.00015 per input, $0.0006 per output
  const inputCost = (inputTokens / 1_000_000) * 0.15;
  const outputCost = (outputTokens / 1_000_000) * 0.60;
  tokenUsage.totalCost += inputCost + outputCost;
  
  console.log(`📊 Tokens: ${inputTokens}in/${outputTokens}out | Cost: $${(inputCost + outputCost).toFixed(4)}`);
}

/**
 * Get token usage statistics
 */
export function getTokenStats() {
  const uptime = Date.now() - tokenUsage.lastReset;
  return {
    ...tokenUsage,
    uptimeMs: uptime,
    avgCostPerHour: (tokenUsage.totalCost / uptime) * 60 * 60 * 1000,
  };
}

/**
 * Reset token tracking (daily/weekly cleanup)
 */
export function resetTokenStats() {
  console.log(`📈 Daily Cost Summary: $${tokenUsage.totalCost.toFixed(2)} | Tokens: ${tokenUsage.totalInputTokens}/${tokenUsage.totalOutputTokens}`);
  tokenUsage.totalInputTokens = 0;
  tokenUsage.totalOutputTokens = 0;
  tokenUsage.totalCost = 0;
  tokenUsage.lastReset = new Date();
}

/**
 * Clear old cache entries
 */
export function clearExpiredCache() {
  let cleared = 0;
  for (const [key, value] of responseCache.entries()) {
    if (Date.now() - value.timestamp > CACHE_DURATION) {
      responseCache.delete(key);
      cleared++;
    }
  }
  console.log(`🧹 Cache cleanup: ${cleared} expired entries removed`);
}

// Legacy export for backward compatibility
export const llm = getLLM();