/**
 * RAG Agent - Handles semantic search across lessons
 * Uses Gemini 2.5 Flash-Lite for cost efficiency
 */

import { generateText, tool, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import * as tools from '../tools';

/**
 * RAG Agent Configuration
 * Specializes in semantic/topic-based searches
 */
const RAG_AGENT_PROMPT = `You are a specialized semantic search agent.

Your ONLY job is to search lessons by topics, meanings, and concepts using vector similarity.

You have 2 tools:
1. searchLessonsByTopic - Search lessons by semantic topic/content
2. searchGrammarTopics - Search for specific grammar topics across lessons

IMPORTANT:
- You do NOT fetch lessons by date
- You do NOT search for specific words (use vocabulary agent)
- You do NOT generate content
- You ONLY search by topics, concepts, and meanings
- Handle both Arabic and English search queries
- ALWAYS provide a text response after calling tools
- If no results found, say "No lessons found matching this topic"
- If results found, present relevant lesson summaries clearly`;

/**
 * RAG Agent Tools
 */
const ragTools = {
  searchLessonsByTopic: tool({
    description: 'Search lessons by semantic topic/content using vector similarity',
    inputSchema: z.object({
      studentId: z.string().describe('The student ID'),
      query: z.string().describe('Search query (can be in Arabic or English)'),
      limit: z.number().min(1).max(20).default(10).describe('Maximum number of results'),
    }),
    execute: async ({ studentId, query, limit = 10 }: { studentId: string; query: string; limit?: number }) => {
      const results = await tools.searchLessonsByTopic(studentId, query, limit);
      return { results };
    },
  }),

  searchGrammarTopics: tool({
    description: 'Search for specific grammar topics across all lessons',
    inputSchema: z.object({
      studentId: z.string().describe('The student ID'),
      query: z.string().describe('Grammar topic query (can be in Arabic or English)'),
      limit: z.number().min(1).max(20).default(10).describe('Maximum number of results'),
    }),
    execute: async ({ studentId, query, limit = 10 }: { studentId: string; query: string; limit?: number }) => {
      const results = await tools.searchGrammarTopics(studentId, query, limit);
      return { results };
    },
  }),
};

/**
 * Execute RAG Agent
 * @param studentId - Student ID
 * @param query - User query related to topics/concepts
 * @returns Semantic search results
 */
export async function runRagAgent(studentId: string, query: string) {
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
        content: RAG_AGENT_PROMPT + `\n\n**CURRENT DATE: ${currentDate}**`,
      },
      {
        role: 'user',
        content: `Student ID: ${studentId}\nQuery: ${query}`,
      },
    ],
    tools: ragTools,
    stopWhen: stepCountIs(2), // Allow up to 2 tool calls if needed
  });

  return {
    result: result.text,
    toolCalls: result.steps || [],
    usage: result.usage,
  };
}
