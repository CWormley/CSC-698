import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";

export interface LLMOptions {
  temperature?: number;
  model?: string;
  maxRetries?: number;
}

export interface TokenUsageStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  lastReset: Date;
  uptimeMs?: number;
  avgCostPerHour?: number;
}

/**
 * Get or create the main LLM instance (gpt-4o-mini)
 */
export function getLLM(options?: LLMOptions): ChatOpenAI;

/**
 * Get cheaper LLM for simple tasks (gpt-3.5-turbo)
 */
export function getCheapLLM(options?: LLMOptions): ChatOpenAI;

/**
 * Get or create the embeddings instance
 */
export function getEmbeddings(): OpenAIEmbeddings;

/**
 * Check cache for existing response
 */
export function getCachedResponse(userId: string, message: string): string | null;

/**
 * Store response in cache
 */
export function setCachedResponse(userId: string, message: string, response: string): void;

/**
 * Determine which model to use based on task
 */
export function selectModelForTask(message: string): 'cheap' | 'main';

/**
 * Track token usage for cost monitoring
 */
export function trackTokenUsage(inputTokens: number, outputTokens: number): void;

/**
 * Get token usage statistics
 */
export function getTokenStats(): TokenUsageStats;

/**
 * Reset token tracking
 */
export function resetTokenStats(): void;

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void;

/**
 * Token usage tracking object
 */
export const tokenUsage: {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  lastReset: Date;
};

/**
 * Legacy export for backward compatibility
 */
export const llm: ChatOpenAI;
