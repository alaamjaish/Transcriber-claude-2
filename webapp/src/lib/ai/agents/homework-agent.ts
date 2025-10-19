/**
 * Homework Agent - Handles creative homework generation
 * Uses Gemini 2.5 Flash (Regular) with thinking enabled for quality
 */

import { generateText, tool, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import * as tools from '../tools';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Homework Agent Configuration
 * Specializes in creating engaging, customized homework
 */
const HOMEWORK_AGENT_PROMPT = `You are a specialized homework generation agent.

Your ONLY job is to create engaging, pedagogically sound homework from lesson content.

You have 1 tool:
- generateHomeworkFromLessons - Create custom homework from a set of lessons

IMPORTANT:
- You do NOT fetch lessons (orchestrator provides lesson IDs)
- You do NOT search for content
- You do NOT summarize
- You ONLY generate creative, relevant homework
- Focus on reinforcing key concepts
- Include a variety of exercise types (translation, fill-in-blank, writing)
- Make it appropriate for the student's level
- ALWAYS provide homework exercises after calling the tool
- If no lessons to work with, say "No lessons available to create homework from"`;

/**
 * Homework Agent Tools
 */
const homeworkTools = {
  generateHomeworkFromLessons: tool({
    description: 'Generate custom homework from a set of lessons',
    inputSchema: z.object({
      lessonIds: z.array(z.string()).describe('Array of lesson IDs to base homework on'),
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

      const homework = await tools.generateHomeworkFromLessons(lessons as tools.Lesson[]);
      return { homework };
    },
  }),
};

/**
 * Execute Homework Agent
 * @param lessonIds - Array of lesson IDs to base homework on
 * @returns Generated homework
 */
export async function runHomeworkAgent(lessonIds: string[]) {
  // Get current date
  const now = new Date();
  const currentDate = now.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const result = await generateText({
    model: google('gemini-2.5-flash'),
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 10000, // Allow some thinking tokens for quality
          includeThoughts: true,
        },
      },
    },
    messages: [
      {
        role: 'system',
        content: HOMEWORK_AGENT_PROMPT + `\n\n**CURRENT DATE: ${currentDate}**`,
      },
      {
        role: 'user',
        content: `Create engaging homework for these ${lessonIds.length} lessons.\nLesson IDs: ${lessonIds.join(', ')}`,
      },
    ],
    tools: homeworkTools,
    stopWhen: stepCountIs(2), // Allow tool call + response
  });

  return {
    result: result.text,
    toolCalls: result.steps || [],
    usage: result.usage,
  };
}
