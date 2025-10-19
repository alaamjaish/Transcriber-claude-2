/**
 * Vocabulary Agent - Handles word and vocabulary searches
 * Uses Gemini 2.5 Flash-Lite for cost efficiency
 */

import { generateText, tool, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import * as tools from '../tools';

/**
 * Vocabulary Agent Configuration
 * Specializes in finding specific words and vocabulary
 */
const VOCABULARY_AGENT_PROMPT = `You are a specialized vocabulary search and extraction agent.

Your job is to find and extract vocabulary from lessons with intelligent parsing and filtering.

# Your Tools:
1. **getAllVocabSince(studentId, months)** - Extract all vocabulary from lessons in the last N months
   - Returns raw markdown vocab sections (### Nouns:, ### Verbs:, etc.)
   - You must parse and filter the results intelligently

2. **searchExactWord(studentId, word)** - Find when a specific word was taught
   - Searches across all lessons for exact word matches

# CRITICAL Parsing Rules:

When user asks for vocab, you MUST:
1. Call the appropriate tool to get raw vocabulary data
2. **Parse the markdown structure intelligently:**
   - Identify sections: "### Nouns:", "### Verbs:", "### Adjectives:", "### Other:"
   - Extract entries in format: "- word - translation" or "- word – translation"
3. **Filter based on user request:**
   - "nouns" → extract only from ### Nouns: section
   - "verbs" → extract only from ### Verbs: section
   - "3-letter words" → filter by character count
   - "all vocab" → extract from all sections
4. **Present results cleanly:**
   - Organize by type if showing multiple types
   - Include translations
   - Format nicely for readability

# Examples:

**Query:** "give me all nouns from last 3 months"
→ Call getAllVocabSince(studentId, 3)
→ Parse markdown, extract only ### Nouns: section
→ Present: "Here are all nouns from the last 3 months: [list]"

**Query:** "vocab from last lesson" (orchestrator will translate "last lesson" to time period)
→ Call getAllVocabSince with appropriate months
→ Parse and extract all vocab types
→ Present organized by category

**Query:** "when did we learn 'table'?"
→ Call searchExactWord(studentId, "table")
→ Present lessons where it appears with dates

# Important:
- Handle both Arabic and English words
- Words may appear with/without Al/ال prefix
- ALWAYS provide a text response after calling tools
- If no results, say "No vocabulary found for this time period"
- Be intelligent - you're an AI, parse and filter the markdown!`;

/**
 * Vocabulary Agent Tools
 */
const vocabularyTools = {
  getAllVocabSince: tool({
    description: 'Extract all vocabulary from lessons in the last N months',
    inputSchema: z.object({
      studentId: z.string().describe('The student ID'),
      months: z.number().min(1).max(12).describe('Number of months to look back'),
    }),
    execute: async ({ studentId, months }: { studentId: string; months: number }) => {
      const vocab = await tools.getAllVocabSince(studentId, months);
      return { vocab };
    },
  }),

  searchExactWord: tool({
    description: 'Find when a specific word was taught (works with Arabic and English)',
    inputSchema: z.object({
      studentId: z.string().describe('The student ID'),
      word: z.string().describe('The word to search for (Arabic or English)'),
    }),
    execute: async ({ studentId, word }: { studentId: string; word: string }) => {
      const result = await tools.searchExactWord(studentId, word);
      return { result };
    },
  }),
};

/**
 * Execute Vocabulary Agent
 * @param studentId - Student ID
 * @param query - User query related to words/vocabulary
 * @returns Vocabulary search results
 */
export async function runVocabularyAgent(studentId: string, query: string) {
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
        content: VOCABULARY_AGENT_PROMPT + `\n\n**CURRENT DATE: ${currentDate}**`,
      },
      {
        role: 'user',
        content: `Student ID: ${studentId}\nQuery: ${query}`,
      },
    ],
    tools: vocabularyTools,
    stopWhen: stepCountIs(2), // Allow up to 2 tool calls if needed
  });

  return {
    result: result.text,
    toolCalls: result.steps || [],
    usage: result.usage,
  };
}
