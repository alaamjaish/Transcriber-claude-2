import { HOMEWORK_INSTRUCTIONS, HOMEWORK_PROMPT, SUMMARY_INSTRUCTIONS, SUMMARY_PROMPT } from "@/lib/ai/prompts";
import { simpleChatCompletion } from "@/lib/ai/openrouter";
import { AI_MODELS, MODEL_SETTINGS } from "@/lib/ai/config";

export async function generateSummary(
  transcript: string,
  userContext?: string,
  promptOverride?: string,
): Promise<string> {
  const content = transcript?.trim();
  if (!content) {
    throw new Error("No transcript provided");
  }

  // Get current date/time
  const currentDate = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // When custom prompt provided, it becomes the system instruction
  const baseSystemInstruction = promptOverride && promptOverride.trim().length > 0
    ? promptOverride
    : SUMMARY_INSTRUCTIONS;

  const systemInstruction = `Current Date/Time: ${currentDate}\n\n${baseSystemInstruction}`;

  const basePromptText = promptOverride && promptOverride.trim().length > 0
    ? "" // Don't duplicate in user message
    : SUMMARY_PROMPT;

  let userPrompt = basePromptText
    ? `${basePromptText}\n\n---\nTRANSCRIPT:\n${content}`
    : `TRANSCRIPT:\n${content}`;

  if (userContext?.trim()) {
    userPrompt += `\n\n---\nADDITIONAL CONTEXT:\n${userContext.trim()}`;
  }

  return simpleChatCompletion({
    model: AI_MODELS.summary,
    systemMessage: systemInstruction,
    userMessage: userPrompt,
    temperature: MODEL_SETTINGS.summary.temperature,
    maxTokens: MODEL_SETTINGS.summary.maxTokens,
  });
}

export async function generateHomework(
  transcript: string,
  userContext?: string,
  promptOverride?: string,
): Promise<string> {
  const content = transcript?.trim();
  if (!content) {
    throw new Error("No transcript provided");
  }

  // Get current date/time
  const currentDate = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // When custom prompt provided, it becomes the system instruction
  const baseSystemInstruction = promptOverride && promptOverride.trim().length > 0
    ? promptOverride
    : HOMEWORK_INSTRUCTIONS;

  const systemInstruction = `Current Date/Time: ${currentDate}\n\n${baseSystemInstruction}`;

  const basePromptText = promptOverride && promptOverride.trim().length > 0
    ? "" // Don't duplicate in user message
    : HOMEWORK_PROMPT;

  let userPrompt = basePromptText
    ? `${basePromptText}\n\n---\nTRANSCRIPT:\n${content}`
    : `TRANSCRIPT:\n${content}`;

  if (userContext?.trim()) {
    userPrompt += `\n\n---\nADDITIONAL CONTEXT:\n${userContext.trim()}`;
  }

  return simpleChatCompletion({
    model: AI_MODELS.homework,
    systemMessage: systemInstruction,
    userMessage: userPrompt,
    temperature: MODEL_SETTINGS.homework.temperature,
    maxTokens: MODEL_SETTINGS.homework.maxTokens,
  });
}
