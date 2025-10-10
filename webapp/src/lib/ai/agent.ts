/**
 * AI Agent Configuration
 * Hybrid RAG + SQL intelligent agent using Vercel AI SDK
 */

import { generateText, tool, stepCountIs } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import * as tools from './tools';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Agent system prompt - defines behavior and tool selection logic
 */
const AGENT_SYSTEM_PROMPT = `You are an intelligent Arabic language tutor assistant with access to a student's lesson history.

Your job is to answer questions about the student's Arabic learning journey by intelligently selecting the right tools:
Your user is going to be the tutor himself, you are going to be his personal helper, assistant
You are speakking to the teacher, not student, so dont talk to the user as (student), but as (teacher)
the user will ask you many questions, they will include the following:
- when did we take this word - the query cab ne in arabic, or in english - or both? (car, شباك، مدرسة, لابتوب، قطار، airport, table, etc )
- the word could be المدرسة , but the word in the db's summary could be مدرسة، so be carefull about this
- your main source of info is the lessons summary stored in the db, each lesson has a summary in it, lesson's summaries are like this:
- "## Lesson Details" (not "Lesson Info" or "Details")
- "## High-Level Summary" (not "Summary" or "Overview")
- "## New Vocabulary" (not "Vocabulary" or "New Vocab" or "Words")
- "## Key Expressions and Phrases" (exact wording!)
- "## Main Grammatical Concepts Discussed" (exact wording!)
- "## Secondary Grammatical Concepts Discussed" (exact wording!)
- "## Pronunciation Notes" (not "Pronunciation" or "Notes")
- "## Cultural Context" (not "Culture" or "Context")
- "## Points for Student Review and Requests" (exact wording!)
- "## Homework" (not "Assignment" or "Tasks")
- you are also provided with tools, both for sql & rag, 
# Tool Selection Strategy

**Use SQL Tools for PRECISE temporal queries:**
- "آخر 10 دروس" / "last 10 lessons" → getRecentLessons
- "درس يوم 17 سبتمبر" / "lesson from Sept 17" → getLessonByDate
- "دروس آخر 3 شهور" / "lessons from last 3 months" → getLessonsInDateRange
- "كل المفردات من يناير" / "all vocab since January" → getAllVocabSince

**Use Generation Tools for CONTENT CREATION:**
- "أعطني واجب من آخر 5 دروس" / "create homework from last 5 lessons" → First retrieve lessons, then generateHomeworkFromLessons
- "لخص لي آخر 3 شهور" / "summarize last 3 months" → First retrieve lessons, then generateSummaryOfSummaries

# Important Rules

1. **Choose the RIGHT tool** - SQL for "when/how many", RAG for "what/topics"
2. **Retrieve ONLY what's needed** - Don't fetch all lessons, be precise
3. **Chain tools when needed** - Retrieve lessons first, then generate content
4. **Answer in the USER'S language** - If they ask in Arabic, respond in Arabic
5. **Be concise** - Focus on answering the question, not explaining everything

You are cost-conscious and efficient. Never retrieve more data than necessary.`;

/**
 * Agent tool definitions with Zod schemas
 */
const agentTools = {
  // SQL Tools
  getRecentLessons: tool({
    description: 'Get the most recent N lessons for a student (precise temporal query)',
    inputSchema: z.object({
      studentId: z.string().describe('The student ID'),
      count: z.number().min(1).max(50).describe('Number of recent lessons to retrieve'),
    }),
    execute: async ({ studentId, count }: { studentId: string; count: number }) => {
      const lessons = await tools.getRecentLessons(studentId, count);
      return { lessons };
    },
  }),

  getLessonByDate: tool({
    description: 'Get lesson from a specific date. IMPORTANT: You must convert natural language dates to YYYY-MM-DD format. Examples: "October 4th" → "2025-10-04", "yesterday" → calculate based on current date, "3 days ago" → calculate based on current date.',
    inputSchema: z.object({
      studentId: z.string().describe('The student ID'),
      date: z.string().describe('REQUIRED FORMAT: YYYY-MM-DD (e.g., 2025-10-04). You MUST convert any natural language date to this exact format before calling this tool.'),
    }),
    execute: async ({ studentId, date }: { studentId: string; date: string }) => {
      const lesson = await tools.getLessonByDate(studentId, date);
      return { lesson };
    },
  }),

  getLessonsInDateRange: tool({
    description: 'Get all lessons within a date range (format: YYYY-MM-DD)',
    inputSchema: z.object({
      studentId: z.string().describe('The student ID'),
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
    }),
    execute: async ({ studentId, startDate, endDate }: { studentId: string; startDate: string; endDate: string }) => {
      const lessons = await tools.getLessonsInDateRange(studentId, startDate, endDate);
      return { lessons };
    },
  }),

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

  // RAG Tools
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

  // Generation Tools
  generateHomeworkFromLessons: tool({
    description: 'Generate custom homework from a set of lessons. IMPORTANT: You must first retrieve lessons using another tool (like getRecentLessons), then pass them here.',
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

  generateSummaryOfSummaries: tool({
    description: 'Generate a meta-summary (summary of summaries) from multiple lessons. IMPORTANT: You must first retrieve lessons using another tool (like getRecentLessons), then pass them here.',
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
 * Main agent function - handles user queries with intelligent tool selection
 */
export async function runAgent(
  studentId: string,
  userId: string,
  userQuery: string,
  methodology?: string,
  studentName?: string,
  conversationHistory?: Array<{ role: string; content: string }>
) {
  // Build system prompt with curriculum if provided
  let systemPrompt = AGENT_SYSTEM_PROMPT;
  if (methodology) {
    systemPrompt += `\n\n# Teaching Methodology & Curriculum\n${methodology}`;
  }

  // Add current date/time context
  const now = new Date();
  const currentDateTime = now.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  // Build messages array with conversation history
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string; providerOptions?: any }> = [
    {
      role: 'system',
      content: systemPrompt,
      providerOptions: {
        anthropic: { cacheControl: { type: 'ephemeral' } }
      }
    }
  ];

  // Add conversation history if provided
  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.forEach((msg) => {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    });
  }

  // Add current user query with context
  messages.push({
    role: 'user',
    content: `Current Date/Time: ${currentDateTime}\nStudent: ${studentName || 'Unknown'}\nStudent ID: ${studentId}\n\nUser Query: ${userQuery}`,
  });

  const result = await generateText({
    model: anthropic('claude-sonnet-4-5-20250929'),
    messages,
    tools: agentTools,
    stopWhen: stepCountIs(5), // Allow up to 5 tool calls (chain retrieval + generation)
    maxRetries: 5, // Increased from default 3
  });

  // CLEAN LOGGING - Only show tool names
  if (result.steps && result.steps.length > 0) {
    const toolNames = result.steps.flatMap((step) =>
      step.toolCalls?.map((tc) => tc.toolName) || []
    );
    console.log('🔧 [TOOLS USED]:', toolNames.join(', '));
  } else {
    console.log('🔧 [TOOLS USED]: None (answered directly)');
  }

  // LOG CACHE STATISTICS
  const cacheMetadata = result.providerMetadata?.anthropic as { cacheCreationInputTokens?: number; cacheReadInputTokens?: number } | undefined;
  if (cacheMetadata) {
    const cacheCreation = cacheMetadata.cacheCreationInputTokens || 0;
    const cacheRead = cacheMetadata.cacheReadInputTokens || 0;

    if (cacheCreation > 0) {
      console.log('💾 [CACHE]: Created', cacheCreation, 'tokens');
    }
    if (cacheRead > 0) {
      console.log('💾 [CACHE]: Read', cacheRead, 'tokens (90% savings!)');
    }
  }

  return {
    response: result.text,
    toolCalls: result.steps || [],
    usage: result.usage,
  };
}
