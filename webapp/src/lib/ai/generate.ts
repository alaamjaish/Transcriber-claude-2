import { HOMEWORK_INSTRUCTIONS, HOMEWORK_PROMPT, OPENAI_MODEL, SUMMARY_INSTRUCTIONS, SUMMARY_PROMPT } from "@/lib/ai/prompts";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export async function generateSummary(transcript: string, userContext?: string, selectedPromptId?: string): Promise<string> {
  const content = transcript?.trim();
  if (!content) {
    throw new Error("No transcript provided");
  }

  // Get custom prompt if selectedPromptId is provided
  let promptText = SUMMARY_PROMPT;
  if (selectedPromptId) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prompt } = await supabase
          .from("prompts")
          .select("prompt_text")
          .eq("id", selectedPromptId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (prompt) {
          promptText = prompt.prompt_text;
        }
      }
    } catch (error) {
      console.error("Failed to fetch custom prompt, using default:", error);
    }
  }

  let userPrompt = `${promptText}\n\n---\nTRANSCRIPT:\n${content}`;

  if (userContext?.trim()) {
    userPrompt += `\n\n---\nADDITIONAL CONTEXT:\n${userContext.trim()}`;
  }

  return callChatCompletion({ system: SUMMARY_INSTRUCTIONS, user: userPrompt });
}

export async function generateHomework(transcript: string, userContext?: string, selectedPromptId?: string): Promise<string> {
  const content = transcript?.trim();
  if (!content) {
    throw new Error("No transcript provided");
  }

  // Get custom prompt if selectedPromptId is provided
  let promptText = HOMEWORK_PROMPT;
  if (selectedPromptId) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prompt } = await supabase
          .from("prompts")
          .select("prompt_text")
          .eq("id", selectedPromptId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (prompt) {
          promptText = prompt.prompt_text;
        }
      }
    } catch (error) {
      console.error("Failed to fetch custom prompt, using default:", error);
    }
  }

  let userPrompt = `${promptText}\n\n---\nTRANSCRIPT:\n${content}`;

  if (userContext?.trim()) {
    userPrompt += `\n\n---\nADDITIONAL CONTEXT:\n${userContext.trim()}`;
  }

  return callChatCompletion({ system: HOMEWORK_INSTRUCTIONS, user: userPrompt });
}
