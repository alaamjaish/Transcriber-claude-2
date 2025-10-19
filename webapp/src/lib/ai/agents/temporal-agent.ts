/**
 * Temporal Agent - Handles time-based lesson queries
 * Uses Gemini 2.5 Flash-Lite for cost efficiency
 */

import { generateText, tool, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import * as tools from '../tools';

// Type for lesson objects
type LessonWithId = { id: string }

// Extend globalThis to include our temporal storage
declare global {
  var __temporalAgentLessonIds: string[] | undefined;
}

/**
 * Temporal Agent Configuration
 * Specializes in date/time-based queries
 */
const TEMPORAL_AGENT_PROMPT = `You are a specialized temporal query agent.

Your ONLY job is to fetch lessons based on time and dates.

You have 3 tools:
1. getRecentLessons - Get the last N lessons
2. getLessonByDate - Get lesson from a specific date
3. getLessonsInDateRange - Get lessons within a date range

IMPORTANT:
- You do NOT analyze content
- You do NOT search by topic
- You do NOT generate content
- You ONLY retrieve lessons based on time/dates
- When you receive a date in natural language, convert it to YYYY-MM-DD format before calling tools
- ALWAYS provide a text response after calling tools
- If no results found, say "No lessons found for this time period"
- If results found, present them clearly with dates and summaries`;

/**
 * Temporal Agent Tools
 */
const temporalTools = {
  getRecentLessons: tool({
    description: 'Get the most recent N lessons for a student',
    inputSchema: z.object({
      studentId: z.string().describe('The student ID'),
      count: z.number().min(1).max(50).describe('Number of recent lessons to retrieve'),
    }),
    execute: async ({ studentId, count }: { studentId: string; count: number }) => {
      const lessons = await tools.getRecentLessons(studentId, count);
      console.log('📅 [getRecentLessons] Retrieved', lessons.length, 'lessons');
      // Store lesson IDs for later extraction
      if (typeof globalThis !== 'undefined') {
        globalThis.__temporalAgentLessonIds = (lessons as LessonWithId[]).map((l) => l.id);
      }
      return { lessons };
    },
  }),

  getLessonByDate: tool({
    description: 'Get lesson from a specific date (format: YYYY-MM-DD)',
    inputSchema: z.object({
      studentId: z.string().describe('The student ID'),
      date: z.string().describe('Date in YYYY-MM-DD format'),
    }),
    execute: async ({ studentId, date }: { studentId: string; date: string }) => {
      const lesson = await tools.getLessonByDate(studentId, date);
      console.log('📅 [getLessonByDate] Retrieved lesson:', lesson?.id || 'none');
      // Store lesson ID for later extraction
      if (typeof globalThis !== 'undefined' && lesson) {
        globalThis.__temporalAgentLessonIds = [lesson.id];
      }
      return { lesson };
    },
  }),

  getLessonsInDateRange: tool({
    description: 'Get all lessons within a date range',
    inputSchema: z.object({
      studentId: z.string().describe('The student ID'),
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
    }),
    execute: async ({ studentId, startDate, endDate }: { studentId: string; startDate: string; endDate: string }) => {
      const lessons = await tools.getLessonsInDateRange(studentId, startDate, endDate);
      console.log('📅 [getLessonsInDateRange] Retrieved', lessons.length, 'lessons');
      // Store lesson IDs for later extraction
      if (typeof globalThis !== 'undefined') {
        globalThis.__temporalAgentLessonIds = (lessons as LessonWithId[]).map((l) => l.id);
      }
      return { lessons };
    },
  }),
  
};

/**
 * Execute Temporal Agent
 * @param studentId - Student ID
 * @param query - User query related to time/dates
 * @returns Lessons based on temporal query
 */
export async function runTemporalAgent(studentId: string, query: string) {
  console.log('📅 [TEMPORAL AGENT] Starting with query:', query);
  console.log('📅 [TEMPORAL AGENT] Student ID:', studentId);

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
        content: TEMPORAL_AGENT_PROMPT + `\n\n**CURRENT DATE: ${currentDate}**\n**CURRENT YEAR: ${now.getFullYear()}**\nWhen converting dates without explicit years, ALWAYS use ${now.getFullYear()}.`,
      },
      {
        role: 'user',
        content: `Student ID: ${studentId}\nQuery: ${query}`,
      },
    ],
    tools: temporalTools,
    stopWhen: stepCountIs(3), // Allow up to 3 tool calls if needed
  });

  console.log('📅 [TEMPORAL AGENT] Result text:', result.text);
  console.log('📅 [TEMPORAL AGENT] Steps count:', result.steps?.length || 0);
  console.log('📅 [TEMPORAL AGENT] Full steps:', JSON.stringify(result.steps, null, 2));

  return {
    result: result.text,
    toolCalls: result.steps || [],
    usage: result.usage,
  };
}
