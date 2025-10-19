'use server';

/**
 * Agent-powered chat for students
 * Uses the intelligent RAG + SQL agent instead of context stuffing
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { runOrchestrator } from '@/lib/ai/orchestrator';
import type { AIChatSession, AIChatMessage } from '@/lib/types';

/**
 * Send a message using the intelligent agent
 */
export async function sendAgentMessage(sessionId: string, studentId: string, userMessage: string) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Save user message
    const { error: userMsgError } = await supabase
      .from('ai_chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: userMessage,
      })
      .select()
      .single();

    if (userMsgError) {
      console.error('[sendAgentMessage] Error saving user message:', userMsgError);
      return { success: false, error: 'Failed to save message' };
    }

    // Fetch teaching methodology
    const { data: settings } = await supabase
      .from('tutor_settings')
      .select('teaching_methodology')
      .eq('user_id', user.id)
      .single();

    const methodology = settings?.teaching_methodology || '';

    // Fetch student name
    const { data: student } = await supabase
      .from('students')
      .select('name')
      .eq('id', studentId)
      .single();

    const studentName = student?.name || 'Unknown Student';

    // Fetch conversation history (ALL messages, will truncate to last 10 in orchestrator)
    const { data: historyData } = await supabase
      .from('ai_chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    // Rolling window: Keep only last 10 messages
    const conversationHistory = (historyData || []).slice(-10);

    // Run the intelligent orchestrator!
    console.log('\n💬 [USER]:', userMessage);
    console.log('📋 [CONTEXT BREAKDOWN]:');
    console.log('  - User message:', userMessage.length, 'chars');
    console.log('  - Conversation history:', conversationHistory.length, 'messages (rolling window: last 10)');
    console.log('  - Student name:', studentName);
    console.log('  - Curriculum:', methodology ? `${methodology.length} chars` : 'None');
    console.log('  - Agents available: 5 (Temporal, Vocabulary, RAG, Summary, Homework)');

    const agentResult = await runOrchestrator(studentId, user.id, userMessage, methodology, studentName, conversationHistory);

    console.log('🤖 [RESPONSE]:', agentResult.response);
    console.log('💰 [TOKENS]:', agentResult.usage);

    // Token breakdown with Gemini 2.5 Flash pricing
    const inputTokens = agentResult.usage.inputTokens || 0;
    const outputTokens = agentResult.usage.outputTokens || 0;
    console.log('📊 [TOKEN BREAKDOWN]:');
    console.log('  - Input tokens:', inputTokens);
    console.log('  - Output tokens:', outputTokens);
    console.log('  - Total:', inputTokens + outputTokens);
    console.log('  - Model: Gemini 2.5 Flash (Orchestrator) + Gemini Flash-Lite (Agents)');
    console.log('  - Estimated cost: $' + ((inputTokens * 0.075 + outputTokens * 0.30) / 1000000).toFixed(6));

    // Save AI response
    const { error: aiMsgError } = await supabase
      .from('ai_chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: agentResult.response,
      });

    if (aiMsgError) {
      console.error('[sendAgentMessage] Error saving AI message:', aiMsgError);
      return { success: false, error: 'Failed to save AI response' };
    }

    // Update session timestamp
    await supabase
      .from('ai_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    // Check if we need to generate a title (first message)
    const { count } = await supabase
      .from('ai_chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    let shouldGenerateTitle = false;

    if (count === 2) {
      // First Q&A pair - generate title
      const title = userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '');
      await supabase
        .from('ai_chat_sessions')
        .update({ title })
        .eq('id', sessionId);

      shouldGenerateTitle = true;
    }

    return {
      success: true,
      aiResponse: agentResult.response,
      toolsUsed: agentResult.toolCalls.length,
      shouldGenerateTitle,
    };
  } catch (error) {
    console.error('[sendAgentMessage] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get chat sessions (reuse existing function)
 */
export async function getChatSessions(studentId: string): Promise<AIChatSession[]> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .select('*')
    .eq('student_id', studentId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[getChatSessions] Error:', error);
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
export async function createChatSession(studentId: string, title: string): Promise<AIChatSession | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .insert({
      student_id: studentId,
      title,
    })
    .select()
    .single();

  if (error) {
    console.error('[createChatSession] Error:', error);
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
 * Get messages for a session
 */
export async function getChatMessages(sessionId: string): Promise<AIChatMessage[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[getChatMessages] Error:', error);
    return [];
  }

  return (
    data?.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      createdAt: row.created_at,
    })) || []
  );
}

/**
 * Delete a chat session
 */
export async function deleteChatSession(sessionId: string) {
  const supabase = await createSupabaseServerClient();

  // Delete messages first (cascade should handle this, but be explicit)
  await supabase.from('ai_chat_messages').delete().eq('session_id', sessionId);

  // Delete session
  const { error } = await supabase.from('ai_chat_sessions').delete().eq('id', sessionId);

  if (error) {
    console.error('[deleteChatSession] Error:', error);
    return { success: false };
  }

  return { success: true };
}
