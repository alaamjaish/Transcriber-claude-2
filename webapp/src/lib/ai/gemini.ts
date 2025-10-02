import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not configured');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Using Gemini 2.5 Pro for best quality
const MODEL_NAME = 'gemini-2.5-flash';

interface GeminiChatRequest {
  systemInstruction: string;
  conversationHistory: Array<{
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
  }>;
  userMessage: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Send a chat request to Gemini 2.5 Pro
 * @param request Chat request with system instruction, history, and user message
 * @returns AI response text
 */
export async function sendGeminiChatRequest({
  systemInstruction,
  conversationHistory,
  userMessage,
  temperature = 0.7,
  maxOutputTokens = 2000,
}: GeminiChatRequest): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction,
    });

    const generationConfig = {
      temperature,
      maxOutputTokens,
      topP: 0.95,
      topK: 40,
    };

    // Start chat with history
    const chat = model.startChat({
      generationConfig,
      history: conversationHistory,
    });

    // Send user message
    const result = await chat.sendMessage(userMessage);
    const response = result.response;
    const text = response.text();

    return text.trim();
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(
      `Failed to generate AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Simple wrapper for single-turn conversations (no history)
 */
export async function sendSimpleGeminiRequest(
  systemInstruction: string,
  userMessage: string,
  temperature = 0.7
): Promise<string> {
  return sendGeminiChatRequest({
    systemInstruction,
    conversationHistory: [],
    userMessage,
    temperature,
  });
}
