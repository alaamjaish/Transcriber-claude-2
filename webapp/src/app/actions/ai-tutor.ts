'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { conversationalChatCompletion, simpleChatCompletion } from '@/lib/ai/openrouter';
import { AI_MODELS, MODEL_SETTINGS } from '@/lib/ai/config';
import { buildAITutorContext, updateTutorMethodology } from '@/lib/ai/ai-tutor-context';
import type { AIChatSession, AIChatMessage, TutorSettings } from '@/lib/types';

/**
 * Get or create tutor settings for current user
 */
export async function getTutorSettings(): Promise<TutorSettings | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('tutor_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching tutor settings:', error);
    return null;
  }

  if (!data) {
    // Create default settings
    const { data: newData, error: insertError } = await supabase
      .from('tutor_settings')
      .insert({ user_id: user.id })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating tutor settings:', insertError);
      return null;
    }

    return {
      id: newData.id,
      userId: newData.user_id,
      teachingMethodology: newData.teaching_methodology,
      createdAt: newData.created_at,
      updatedAt: newData.updated_at,
    };
  }

  return {
    id: data.id,
    userId: data.user_id,
    teachingMethodology: data.teaching_methodology,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Update teaching methodology
 */
export async function saveTeachingMethodology(methodology: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    await updateTutorMethodology(user.id, methodology);

    return { success: true };
  } catch (error) {
    console.error('Error saving methodology:', error);
    return { success: false, error: 'Failed to save methodology' };
  }
}

/**
 * Get all chat sessions for a student
 */
export async function getChatSessions(studentId: string): Promise<AIChatSession[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .select('*')
    .eq('student_id', studentId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching chat sessions:', error);
    return [];
  }

  return (
    data?.map((row) => ({
      id: row.id,
      studentId: row.student_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) || []
  );
}

/**
 * Create a new chat session
 */
export async function createChatSession(studentId: string, title?: string): Promise<AIChatSession | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .insert({
      student_id: studentId,
      title: title || 'New Conversation',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating chat session:', error);
    return null;
  }

  return {
    id: data.id,
    studentId: data.student_id,
    title: data.title,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Update chat session title
 */
export async function updateChatSessionTitle(sessionId: string, title: string): Promise<{ success: boolean }> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('ai_chat_sessions')
    .update({
      title,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Error updating chat session:', error);
    return { success: false };
  }

  return { success: true };
}

/**
 * Delete a chat session
 */
export async function deleteChatSession(sessionId: string): Promise<{ success: boolean }> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('ai_chat_sessions').delete().eq('id', sessionId);

  if (error) {
    console.error('Error deleting chat session:', error);
    return { success: false };
  }

  return { success: true };
}

/**
 * Get all messages for a chat session
 */
export async function getChatMessages(sessionId: string): Promise<AIChatMessage[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching chat messages:', error);
    return [];
  }

  return (
    data?.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      role: row.role as 'user' | 'assistant' | 'system',
      content: row.content,
      tokensUsed: row.tokens_used || undefined,
      createdAt: row.created_at,
    })) || []
  );
}

/**
 * Generate a smart conversation title from the first user message
 */
export async function generateChatTitle(userMessage: string): Promise<string> {
  try {
    const systemPrompt = `You are a title generator. Generate a short, concise title (3-6 words max) for a conversation based on the user's first message.
Rules:
- Keep it SHORT (3-6 words maximum)
- Make it descriptive and specific
- Use title case
- NO quotes or special characters
- Focus on the main topic`;

    const title = await simpleChatCompletion({
      model: AI_MODELS.titleGeneration,
      systemMessage: systemPrompt,
      userMessage: `Generate a short title for this conversation: "${userMessage}"`,
      temperature: MODEL_SETTINGS.titleGeneration.temperature,
      maxTokens: MODEL_SETTINGS.titleGeneration.maxTokens,
    });

    // Clean up the title
    const cleanTitle = title.replace(/['"]/g, '').trim();

    // Ensure it's not too long
    return cleanTitle.length > 50 ? cleanTitle.substring(0, 50) + '...' : cleanTitle;
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Conversation';
  }
}

/**
 * Send a message and get AI response
 */
export async function sendChatMessage(
  sessionId: string,
  studentId: string,
  userMessage: string
): Promise<{ success: boolean; aiResponse?: string; error?: string; shouldGenerateTitle?: boolean }> {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 1. Build AI context (system instruction with lessons)
    const { systemInstruction } = await buildAITutorContext(studentId, user.id);

    // 2. Fetch conversation history
    const messages = await getChatMessages(sessionId);
    const isFirstMessage = messages.length === 0;

    // 3. Convert to OpenRouter format (user/assistant roles)
    const conversationHistory = messages.map((msg) => ({
      role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.content,
    }));

    // 4. Send to OpenRouter (Claude/Gemini/GPT - configured in config.ts)
    const aiResponse = await conversationalChatCompletion({
      model: AI_MODELS.chat,
      systemMessage: systemInstruction,
      conversationHistory,
      userMessage,
      temperature: MODEL_SETTINGS.chat.temperature,
      maxTokens: MODEL_SETTINGS.chat.maxTokens,
    });

    // 5. Save both messages to database
    await supabase.from('ai_chat_messages').insert([
      {
        session_id: sessionId,
        role: 'user',
        content: userMessage,
      },
      {
        session_id: sessionId,
        role: 'assistant',
        content: aiResponse,
      },
    ]);

    // 6. Update session updated_at
    await supabase
      .from('ai_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    // 7. Generate title if this is the first message
    if (isFirstMessage) {
      const title = await generateChatTitle(userMessage);
      await updateChatSessionTitle(sessionId, title);
    }

    return { success: true, aiResponse, shouldGenerateTitle: isFirstMessage };
  } catch (error) {
    console.error('Error sending chat message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message',
    };
  }
}


