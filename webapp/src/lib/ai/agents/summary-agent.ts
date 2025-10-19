/**
 * Summary Agent - Handles summarization of multiple lessons
 * Uses Gemini 2.5 Flash-Lite for cost efficiency
 */

import { generateText, tool, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import * as tools from '../tools';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Summary Agent Configuration
 * Specializes in creating meta-summaries from multiple lessons
 */
const SUMMARY_AGENT_PROMPT = `You are a specialized summarization agent.

Your ONLY job is to read multiple lesson summaries and create a concise meta-summary.

You have 1 tool:
- generateSummaryOfSummaries - Create a meta-summary from multiple lessons

IMPORTANT:
- You do NOT fetch lessons (orchestrator provides lesson IDs)
- You do NOT search for content
- You do NOT generate homework
- You ONLY read and condense information
- Be concise and focus on key learning points
- Organize by topic/theme when possible
- ALWAYS provide a summary response after calling the tool
- If no lessons to summarize, say "No lessons available to summarize"`;

/**
 * Summary Agent Tools
 */
const summaryTools = {
  generateSummaryOfSummaries: tool({
    description: 'Generate a meta-summary (summary of summaries) from multiple lessons',
    inputSchema: z.object({
      lessonIds: z.array(z.string()).describe('Array of lesson IDs to summarize'),
    }),
    execute: async ({ lessonIds }: { lessonIds: string[] }) => {
      // Fetch lessons from database
      const supabase = await createSupabaseServerClient();
      const { data: lessons, error } = await supabase
        .from('sessions')
        .select('id, created_at, summary_md')
        .in('id', lessonIds);

      if (error || !lessons) {
        throw new Error(`Failed to fetch lessons: ${error?.message}`);
      }

      const summary = await tools.generateSummaryOfSummaries(lessons as tools.Lesson[]);
      return { summary };
    },
  }),
};

/**
 * Execute Summary Agent
 * @param lessonIds - Array of lesson IDs to summarize
 * @returns Meta-summary of lessons
 */
export async function runSummaryAgent(lessonIds: string[]) {
  // Get current date
  const now = new Date();
  const currentDate = now.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const result = await generateText({
    model: google('gemini-2.5-flash-lite'),
    messages: [
      {
        role: 'system',
        content: SUMMARY_AGENT_PROMPT + `\n\n**CURRENT DATE: ${currentDate}**`,
      },
      {
        role: 'user',
        content: `Create a meta-summary for these ${lessonIds.length} lessons.\nLesson IDs: ${lessonIds.join(', ')}`,
      },
    ],
    tools: summaryTools,
    stopWhen: stepCountIs(2), // Allow tool call + response
  });

  return {
    result: result.text,
    toolCalls: result.steps || [],
    usage: result.usage,
  };
}
