import { HOMEWORK_INSTRUCTIONS, HOMEWORK_PROMPT, OPENAI_MODEL, SUMMARY_INSTRUCTIONS, SUMMARY_PROMPT } from "@/lib/ai/prompts";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

interface ChatRequest {
  system: string;
  user: string;
  temperature?: number;
}

async function callChatCompletion({ system, user, temperature = 1 }: ChatRequest): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the server");
  }

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message ?? "OpenAI API error";
    throw new Error(message);
  }

  const text: string | undefined = data?.choices?.[0]?.message?.content;
  return text?.trim() ?? "";
}

export async function generateSummary(
  transcript: string,
  userContext?: string,
  promptOverride?: string,
): Promise<string> {
  const content = transcript?.trim();
  if (!content) {
    throw new Error("No transcript provided");
  }

  // When custom prompt provided, it becomes the system instruction
  const systemInstruction = promptOverride && promptOverride.trim().length > 0
    ? promptOverride
    : SUMMARY_INSTRUCTIONS;

  const basePromptText = promptOverride && promptOverride.trim().length > 0
    ? "" // Don't duplicate in user message
    : SUMMARY_PROMPT;

  let userPrompt = basePromptText
    ? `${basePromptText}\n\n---\nTRANSCRIPT:\n${content}`
    : `TRANSCRIPT:\n${content}`;

  if (userContext?.trim()) {
    userPrompt += `\n\n---\nADDITIONAL CONTEXT:\n${userContext.trim()}`;
  }

  return callChatCompletion({ system: systemInstruction, user: userPrompt });
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

  // When custom prompt provided, it becomes the system instruction
  const systemInstruction = promptOverride && promptOverride.trim().length > 0
    ? promptOverride
    : HOMEWORK_INSTRUCTIONS;

  const basePromptText = promptOverride && promptOverride.trim().length > 0
    ? "" // Don't duplicate in user message
    : HOMEWORK_PROMPT;

  let userPrompt = basePromptText
    ? `${basePromptText}\n\n---\nTRANSCRIPT:\n${content}`
    : `TRANSCRIPT:\n${content}`;

  if (userContext?.trim()) {
    userPrompt += `\n\n---\nADDITIONAL CONTEXT:\n${userContext.trim()}`;
  }

  return callChatCompletion({ system: systemInstruction, user: userPrompt });
}
