import { simpleChatCompletion } from "@/lib/ai/openrouter";
import { MODEL_SETTINGS } from "@/lib/ai/config";

// Use Gemini Flash 2.5 for demo - blazing fast and cheap!
const DEMO_MODEL = 'google/gemini-2.5-flash';

// General-purpose prompt for demo recordings
const DEMO_SUMMARY_INSTRUCTIONS = `You are an AI assistant that creates clear, well-organized summaries of recorded conversations, meetings, lessons, or any other spoken content.

Your task is to analyze the transcript and create a helpful summary. IMPORTANT: This is a demo, so ALWAYS generate a friendly, helpful summary even if the transcript is very short, contains only filler words, or seems incomplete. Never refuse to create a summary.`;

const DEMO_SUMMARY_PROMPT = `Create a clear and well-structured summary of the following recording.

IMPORTANT: This is a DEMO, so you MUST always generate a summary no matter what. Even if the transcript is very short, contains only filler words like "um", "uh", or is just a few words, create a friendly summary.

For short or minimal transcripts:
- Acknowledge what was said in a friendly way
- Create a brief, encouraging summary
- Example: If transcript is just "hello" or "um um", create a summary like "## Demo Recording\n\nThis was a brief test recording. The speaker said a few words, which demonstrates how the transcription system captures audio in real-time."

For substantial transcripts, your summary should:
1. Identify the main topics or themes discussed
2. Highlight key points, decisions, or important information
3. Organize the information in a logical, easy-to-understand format
4. Use bullet points and clear headings where appropriate
5. Be concise but comprehensive - capture what matters most

Format your summary using Markdown with appropriate headings (##) and bullet points.`;

/**
 * Generate a general-purpose summary for demo recordings
 * This is designed to work with any type of content (lessons, meetings, conversations, etc.)
 *
 * Uses Gemini Flash 2.5 for:
 * - Blazing fast responses (great for demos!)
 * - Very cheap cost (one of the cheapest models)
 * - High quality summaries
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
    model: DEMO_MODEL, // Gemini Flash 2.5 - cheap and blazing fast! 🚀
    systemMessage: systemInstruction,
    userMessage: userPrompt,
    temperature: MODEL_SETTINGS.summary.temperature,
    maxTokens: MODEL_SETTINGS.summary.maxTokens,
  });
}
