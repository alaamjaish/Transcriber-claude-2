/**
 * AI Model Configuration
 *
 * Centralized configuration for all AI model usage across the application.
 * Change models here to experiment with different providers.
 *
 * Available providers via OpenRouter:
 * - openai/* (GPT-4, GPT-4o, o1, etc.)
 * - anthropic/* (Claude 3.5 Sonnet, Opus, Haiku)
 * - google/* (Gemini Pro, Flash, Ultra)
 * - meta-llama/* (Llama models)
 * - mistralai/* (Mistral models)
 * - x-ai/* (Grok)
 */

export const AI_MODELS = {
  /**
   * Summary Generation
   * Recommended: Fast, cost-effective models
   * Current: GPT-5.1 Chat (Instant) - Fast, non-reasoning variant optimized for speed
   */
  summary: 'openai/gpt-5.1-chat',

  /**
   * Homework Generation
   * Recommended: Balanced quality/cost
   * Current: GPT-4o (great structured output)
   */
  homework: 'google/gemini-2.5-flash',

  /**
   * AI Tutor Chat (Main Feature)
   * Recommended: Best reasoning, large context
   * Current: Claude 3.5 Sonnet (excellent reasoning + Arabic)
   */
  chat: 'google/gemini-2.5-flash',

  /**
   * Chat Title Generation
   * Recommended: Fast, cheap models
   * Current: Gemini Flash (very cheap, fast enough)
   */
  titleGeneration: 'google/gemini-2.5-flash',
} as const;

/**
 * Model-specific settings
 */
export const MODEL_SETTINGS = {
  summary: {
    temperature: 1.0,
    maxTokens: 3500,
  },
  homework: {
    temperature: 1.0,
    maxTokens: 3500,
  },
  chat: {
    temperature: 0.7,
    maxTokens: 4000,
  },
  titleGeneration: {
    temperature: 0.7,
    maxTokens: 50,
  },
} as const;

/**
 * API Configuration
 */
export const API_CONFIG = {
  openRouterBaseUrl: 'https://openrouter.ai/api/v1',

  /**
   * Your site URL for OpenRouter attribution (optional)
   * Helps OpenRouter understand usage patterns
   */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://your-app.com',

  /**
   * Your site name for OpenRouter attribution (optional)
   */
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'AI Tutoring Platform',
} as const;
