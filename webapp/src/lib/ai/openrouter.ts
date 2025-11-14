import { API_CONFIG } from './config';

/**
 * OpenRouter API Client
 *
 * Unified interface for calling any AI model through OpenRouter.
 * Uses OpenAI-compatible API format for easy migration.
 */

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  reasoning?: {
    effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high';
  };
}

interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Get OpenRouter API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured on the server');
  }
  return apiKey;
}

/**
 * Call OpenRouter Chat Completions API
 *
 * @param request - Chat completion request
 * @returns AI response text
 */
export async function callOpenRouter(request: ChatCompletionRequest): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(`${API_CONFIG.openRouterBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': API_CONFIG.siteUrl,
      'X-Title': API_CONFIG.siteName,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData?.error?.message || `OpenRouter API error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const data: ChatCompletionResponse = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('No response content from OpenRouter');
  }

  return text.trim();
}

/**
 * Simple chat completion (system + user message)
 *
 * Use this for: summaries, homework, single-turn interactions
 */
export async function simpleChatCompletion({
  model,
  systemMessage,
  userMessage,
  temperature = 0.7,
  maxTokens = 2000,
  reasoningEffort,
}: {
  model: string;
  systemMessage: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: 'none' | 'minimal' | 'low' | 'medium' | 'high';
}): Promise<string> {
  const request: ChatCompletionRequest = {
    model,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature,
    max_tokens: maxTokens,
  };

  // Add reasoning parameter if specified
  if (reasoningEffort) {
    request.reasoning = { effort: reasoningEffort };
  }

  return callOpenRouter(request);
}

/**
 * Conversational chat completion with history
 *
 * Use this for: AI tutor chat with persistent conversation
 */
export async function conversationalChatCompletion({
  model,
  systemMessage,
  conversationHistory,
  userMessage,
  temperature = 0.7,
  maxTokens = 4000,
}: {
  model: string;
  systemMessage: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const messages: Message[] = [{ role: 'system', content: systemMessage }];

  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  return callOpenRouter({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });
}
