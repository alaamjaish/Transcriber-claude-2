import { simpleChatCompletion } from "@/lib/ai/openrouter";
import { AI_MODELS, MODEL_SETTINGS } from "@/lib/ai/config";

// General-purpose prompt for demo recordings
const DEMO_SUMMARY_INSTRUCTIONS = `You are an AI assistant that creates clear, well-organized summaries of recorded conversations, meetings, lessons, or any other spoken content.

Your task is to analyze the transcript and create a comprehensive but concise summary that captures the key information.`;

const DEMO_SUMMARY_PROMPT = `Create a clear and well-structured summary of the following recording.

Your summary should:
1. Identify the main topics or themes discussed
2. Highlight key points, decisions, or important information
3. Organize the information in a logical, easy-to-understand format
4. Use bullet points and clear headings where appropriate
5. Be concise but comprehensive - capture what matters most

Format your summary using Markdown with appropriate headings (##) and bullet points.`;

/**
 * Generate a general-purpose summary for demo recordings
 * This is designed to work with any type of content (lessons, meetings, conversations, etc.)
 */
export async function generateDemoSummary(transcript: string): Promise<string> {
  const content = transcript?.trim();
  if (!content) {
    throw new Error("No transcript provided");
  }

  const recordingDate = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const systemInstruction = `Recording Date: ${recordingDate}\n\n${DEMO_SUMMARY_INSTRUCTIONS}`;

  const userPrompt = `${DEMO_SUMMARY_PROMPT}\n\n---\nTRANSCRIPT:\n${content}`;

  return simpleChatCompletion({
    model: AI_MODELS.summary, // Use same model as regular summaries
    systemMessage: systemInstruction,
    userMessage: userPrompt,
    temperature: MODEL_SETTINGS.summary.temperature,
    maxTokens: MODEL_SETTINGS.summary.maxTokens,
  });
}
