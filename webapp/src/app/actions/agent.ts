'use server';

/**
 * Server action for AI agent interactions
 */

import { runAgent } from '@/lib/ai/agent';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function testAgentAction(query: string, testStudentId?: string) {
  try {
    // TESTING MODE: If testStudentId provided, use it directly
    if (testStudentId) {
      console.log('[TEST MODE] Using student ID:', testStudentId);
      const result = await runAgent(testStudentId, 'test-user', query, undefined, 'Test Student');

      // Serialize tool calls - AI SDK v5 returns steps with different structure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const serializedToolCalls = (result.toolCalls as any[]).map((step: any) => ({
        toolCalls: step.toolCalls || [],
        toolResults: step.toolResults || [],
        text: step.text || '',
      }));

      return {
        success: true,
        response: result.response,
        toolCalls: serializedToolCalls,
        usage: result.usage,
      };
    }

    // PRODUCTION MODE: Get authenticated user
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const studentId = user.id;

    // Run the agent
    const result = await runAgent(studentId, user.id, query, undefined, 'Test Student');

    // Serialize toolCalls to plain objects (they contain non-serializable class instances)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serializedToolCalls = (result.toolCalls as any[]).map((step: any) => ({
      toolCalls: step.toolCalls || [],
      toolResults: step.toolResults || [],
      text: step.text || '',
    }));

    return {
      success: true,
      response: result.response,
      toolCalls: serializedToolCalls,
      usage: result.usage,
    };
  } catch (error) {
    console.error('[testAgentAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
