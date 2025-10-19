/**
 * Orchestrator - Routes user queries to specialized agents
 * Uses Claude Sonnet 4.5 for intelligent routing decisions
 */

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { runTemporalAgent } from './agents/temporal-agent';
import { runVocabularyAgent } from './agents/vocabulary-agent';
import { runRagAgent } from './agents/rag-agent';
import { runSummaryAgent } from './agents/summary-agent';
import { runHomeworkAgent } from './agents/homework-agent';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Fetch lightweight lesson index for student awareness
 * Returns minimal data: id + date only
 */
async function fetchLessonIndex(studentId: string): Promise<Array<{ id: string; date: string }>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('sessions')
    .select('id, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(100); // Limit to last 100 lessons to control tokens

  if (error) {
    console.error('❌ [fetchLessonIndex] Error:', error);
    return [];
  }

  return (data || []).map((lesson) => ({
    id: lesson.id,
    date: lesson.created_at,
  }));
}

/**
 * Format lesson index for orchestrator context
 * Creates human-readable list with relative time
 */
function formatLessonIndex(lessons: Array<{ id: string; date: string }>, currentDate: Date): string {
  if (lessons.length === 0) {
    return 'No lessons found for this student.';
  }

  const lines: string[] = [];
  lines.push(`## Lesson History (${lessons.length} lessons)`);

  lessons.forEach((lesson, index) => {
    const lessonDate = new Date(lesson.date);
    const diffMs = currentDate.getTime() - lessonDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let relativeTime = '';
    if (diffDays === 0) {
      relativeTime = 'today';
    } else if (diffDays === 1) {
      relativeTime = 'yesterday';
    } else if (diffDays < 7) {
      relativeTime = `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      relativeTime = `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      relativeTime = `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      relativeTime = `${years} year${years > 1 ? 's' : ''} ago`;
    }

    const dateStr = lessonDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    lines.push(`${index + 1}. ${dateStr} (${relativeTime})`);
  });

  return lines.join('\n');
}

/**
 * Helper function to extract temporal patterns from user query
 * Transforms content-generation queries into pure temporal queries
 */
function extractTemporalQuery(userQuery: string): string {
  // Look for temporal patterns in the query
  const patterns = [
    /(?:from|in|during|over)\s+(the\s+)?last\s+\d+\s+\w+/gi,     // "from the last 5 lessons"
    /last\s+\d+\s+\w+/gi,                                          // "last 10 lessons"
    /(?:this|last)\s+(?:month|week|year)/gi,                      // "this month", "last week"
    /(?:recent|latest)\s+\d*\s*\w*/gi,                            // "recent lessons"
    /\d+\s+months?\s+(?:ago|back)/gi,                             // "3 months ago"
  ];

  for (const pattern of patterns) {
    const match = userQuery.match(pattern);
    if (match && match[0]) {
      // Found temporal pattern, build query
      const temporal = match[0].trim();
      // Check if it already mentions lessons
      if (/lesson/i.test(temporal)) {
        return `Get the ${temporal}`;
      } else {
        return `Get lessons from ${temporal}`;
      }
    }
  }

  // No temporal pattern found, return default
  return 'Get the last 5 lessons';
}

/**
 * Helper function to extract lesson IDs from agent tool results
 * Parses through the AI SDK's step results to find lesson data
 */
function extractLessonIdsFromAgentResult(agentResult: { toolCalls: any[] }): string[] {
  console.log('🔍 [extractLessonIds] Analyzing agent result...');
  console.log('🔍 [extractLessonIds] toolCalls array length:', agentResult.toolCalls?.length || 0);

  // FIRST: Try to get lesson IDs from global store (set by temporal agent tools)
  if (typeof globalThis !== 'undefined' && (globalThis as any).__temporalAgentLessonIds) {
    const lessonIds = (globalThis as any).__temporalAgentLessonIds;
    console.log('✅ [extractLessonIds] Found', lessonIds.length, 'lesson IDs from global store:', lessonIds);
    // Clear the global store
    delete (globalThis as any).__temporalAgentLessonIds;
    return lessonIds;
  }

  // FALLBACK: Try to parse from tool results structure
  const lessonIds: string[] = [];

  // Parse through tool calls to find lessons
  if (agentResult.toolCalls && Array.isArray(agentResult.toolCalls)) {
    for (let i = 0; i < agentResult.toolCalls.length; i++) {
      const step = agentResult.toolCalls[i];
      console.log(`🔍 [extractLessonIds] Step ${i}:`, JSON.stringify(step, null, 2));

      if (step.toolResults) {
        console.log(`🔍 [extractLessonIds] Step ${i} has toolResults, count:`, step.toolResults.length);
        for (const toolResult of step.toolResults) {
          console.log('🔍 [extractLessonIds] Tool result:', JSON.stringify(toolResult, null, 2));
          // Check for lessons in tool result
          const result = toolResult.result;
          if (result) {
            // Handle single lesson (getLessonByDate)
            if (result.lesson && result.lesson.id) {
              console.log('✅ [extractLessonIds] Found single lesson:', result.lesson.id);
              lessonIds.push(result.lesson.id);
            }
            // Handle multiple lessons (getRecentLessons, getLessonsInDateRange)
            if (result.lessons && Array.isArray(result.lessons)) {
              console.log('✅ [extractLessonIds] Found', result.lessons.length, 'lessons');
              lessonIds.push(...result.lessons.map((l: any) => l.id).filter(Boolean));
            }
          } else {
            console.warn('⚠️ [extractLessonIds] Tool result has no result property');
          }
        }
      } else {
        console.warn(`⚠️ [extractLessonIds] Step ${i} has no toolResults`);
      }
    }
  } else {
    console.warn('⚠️ [extractLessonIds] No toolCalls array found or not an array');
  }

  console.log('📋 [extractLessonIds] Extracted', lessonIds.length, 'lesson IDs:', lessonIds);
  return lessonIds;
}

/**
 * Orchestrator System Prompt
 * Intelligent routing with contextual awareness
 */
const ORCHESTRATOR_PROMPT = `You are an intelligent orchestrator for an Arabic language tutor assistant.

# YOUR CONTEXT (what you KNOW):

You have access to the student's complete **lesson history** - a list of lessons with dates (but NOT the content inside them).

Example of what you know:
- Total lessons: 47
- Lesson #1: October 12, 2025 (2 days ago)
- Lesson #2: October 10, 2025 (4 days ago)
- Lesson #3: October 4, 2025 (10 days ago)
- ...and so on

You also know:
- Current date and time
- Student name and ID
- Teaching methodology (if provided)

# YOUR JOB:

Analyze the user's question and decide:

**Can I answer this from what I already know?**
- YES → Answer directly and naturally
- NO → Route to the appropriate specialist agent

# ROUTING PRINCIPLES:

**Answer DIRECTLY when:**
- User asks about lesson COUNT ("how many lessons?", "كم درس؟")
- User asks about DATES ("when was last lesson?", "متى كان آخر درس؟")
- User asks about TIME SPANS ("how long have we studied?")
- User wants a GREETING response
- ANY question where you have the complete answer in your context

**Route to AGENTS when user needs lesson CONTENT:**
- **temporal_agent**: "what did we learn?", "show me the lesson", "tell me about the lesson", "review what we took", "what did we take?", "check my lessons", "practice speaking based on lessons"
- **vocabulary_agent**: "vocab from X", "words we learned", "when did we learn [word]?"
- **rag_agent**: "lessons about [topic]", "grammar rules", "concepts related to X"
- **summary_agent**: "summarize lessons", "overview of X", "give me suggestions based on lessons"
- **homework_agent**: "create homework", "generate exercises"

**CRITICAL - PEDAGOGICAL PLANNING QUERIES:**
If user asks "how to practice speaking", "give me suggestions", "what should we review", "let's practice X" → They need lesson content first!
- Route to **temporal_agent** to fetch recent lessons
- The temporal agent will provide lesson summaries
- User can then see what was covered and plan speaking practice

# OUTPUT FORMAT:

**For direct answers:**
Respond naturally in the conversation language. NO special prefix.

**For agent routing:**
Start with: "ROUTE: [agent_name]"
Then optionally explain why (helpful for debugging).

# INTELLIGENCE GUIDELINES:

- Think about WHAT the user actually wants to know
- Use your lesson history context intelligently
- Don't overthink - if you have the data, just answer
- Dates and counts are EASY for you - don't delegate them
- Content, vocab, grammar analysis = need agents
- Be conversational and helpful
- Handle both Arabic and English queries naturally

# EXAMPLES:

User: "مرحبا"
You: "أهلاً! كيف يمكنني مساعدتك؟"

User: "كم درس أخذنا؟"
You: "أخذت 47 درساً حتى الآن." (you can count from lesson history)

User: "متى كان آخر درس؟"
You: "آخر درس كان في 12 أكتوبر 2025 (قبل يومين)." (you know the date)

User: "شو تعلمنا في آخر درس؟"
You: "ROUTE: temporal_agent" (needs lesson CONTENT, which you don't have)

User: "المفردات من آخر 5 دروس"
You: "ROUTE: vocabulary_agent" (needs vocab extraction from content)

User: "عطيني واجب من آخر درسين"
You: "ROUTE: homework_agent" (needs content generation)

REMEMBER: You're smart. You know dates and counts. Don't route what you can answer yourself.`;

/**
 * Main Orchestrator Function
 */
export async function runOrchestrator(
  studentId: string,
  userId: string,
  userQuery: string,
  methodology?: string,
  studentName?: string,
  conversationHistory?: Array<{ role: string; content: string }>
) {
  // Implement rolling window: Keep only last 10 messages
  const recentHistory = conversationHistory?.slice(-10) || [];

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

  // Fetch lesson index for awareness
  console.log('📚 [ORCHESTRATOR] Fetching lesson index for student:', studentId);
  const lessonIndex = await fetchLessonIndex(studentId);
  const formattedLessonIndex = formatLessonIndex(lessonIndex, now);
  console.log('📚 [ORCHESTRATOR] Lesson index loaded:', lessonIndex.length, 'lessons');

  // Build orchestrator context with lesson awareness
  let systemPrompt = ORCHESTRATOR_PROMPT;

  // Add student context header
  systemPrompt += `\n\n# Student Context\n`;
  systemPrompt += `- Student: ${studentName || 'Unknown'}\n`;
  systemPrompt += `- Student ID: ${studentId}\n`;
  systemPrompt += `- Current Date/Time: ${currentDateTime}\n`;
  systemPrompt += `\n${formattedLessonIndex}`;

  if (methodology) {
    systemPrompt += `\n\n# Teaching Methodology & Curriculum\n${methodology}`;
  }

  // Build messages array for Gemini (uses systemInstruction instead of system message)
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Add conversation history (last 10 only!)
  if (recentHistory.length > 0) {
    recentHistory.forEach((msg) => {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    });
  }

  // Add current user query (simpler now since context is in system prompt)
  messages.push({
    role: 'user',
    content: `User Query: ${userQuery}`,
  });

  console.log('\n🎩 [ORCHESTRATOR] Analyzing query:', userQuery);

  // Get routing decision from orchestrator
  const routingDecision = await generateText({
    model: google('gemini-2.5-flash'),
    system: systemPrompt, // Gemini uses 'system' parameter
    messages,
    maxOutputTokens: 500, // Routing decision should be brief
  });

  console.log('🎯 [ORCHESTRATOR] Routing decision:', routingDecision.text);

  // Parse routing decision and delegate to agent
  const route = routingDecision.text.toLowerCase().trim();

  // Extract first line to check for routing directive
  const firstLine = routingDecision.text.trim().split('\n')[0].toLowerCase();

  // Check if this is a conversational query (no agent routing needed)
  // Must explicitly start with "ROUTE:" or contain agent names
  const hasAgentRoute = firstLine.startsWith('route:') ||
                        route.includes('temporal_agent') ||
                        route.includes('vocabulary_agent') ||
                        route.includes('rag_agent') ||
                        route.includes('summary_agent') ||
                        route.includes('homework_agent');

  if (!hasAgentRoute) {
    // Conversational/greeting query - return orchestrator's response directly
    console.log('💬 [ORCHESTRATOR] Conversational query - no agent needed');
    return {
      response: routingDecision.text,
      toolCalls: [],
      usage: routingDecision.usage,
    };
  }

  let agentResult;

  // Route to appropriate agent
  if (route.includes('temporal_agent')) {
    console.log('📅 [ORCHESTRATOR] → Temporal Agent');
    agentResult = await runTemporalAgent(studentId, userQuery);
  }
  else if (route.includes('vocabulary_agent')) {
    console.log('📖 [ORCHESTRATOR] → Vocabulary Agent');
    agentResult = await runVocabularyAgent(studentId, userQuery);
  }
  else if (route.includes('rag_agent')) {
    console.log('🔍 [ORCHESTRATOR] → RAG Agent');
    agentResult = await runRagAgent(studentId, userQuery);
  }
  else if (route.includes('summary_agent')) {
    // For summary, first get lessons, then summarize
    console.log('📊 [ORCHESTRATOR] → Temporal Agent (for lessons) → Summary Agent');

    // Transform user query into a pure temporal query
    const temporalQuery = extractTemporalQuery(userQuery);
    console.log('📊 [ORCHESTRATOR] Transformed query for temporal agent:', temporalQuery);

    const temporalResult = await runTemporalAgent(studentId, temporalQuery);

    // Extract lesson IDs from temporal agent's tool results
    const lessonIds = extractLessonIdsFromAgentResult(temporalResult);

    if (lessonIds.length === 0) {
      console.warn('⚠️ [ORCHESTRATOR] No lessons found by temporal agent');
      agentResult = {
        result: 'No lessons found for the specified time period.',
        toolCalls: [],
        usage: temporalResult.usage,
      };
    } else {
      console.log('📋 [ORCHESTRATOR] Found', lessonIds.length, 'lessons, generating summary...');
      const summaryResult = await runSummaryAgent(lessonIds);

      // Combine usage stats
      agentResult = {
        result: summaryResult.result,
        toolCalls: [...temporalResult.toolCalls, ...summaryResult.toolCalls],
        usage: {
          inputTokens: (temporalResult.usage.inputTokens || 0) + (summaryResult.usage.inputTokens || 0),
          outputTokens: (temporalResult.usage.outputTokens || 0) + (summaryResult.usage.outputTokens || 0),
          totalTokens: (temporalResult.usage.totalTokens || 0) + (summaryResult.usage.totalTokens || 0),
        },
      };
    }
  }
  else if (route.includes('homework_agent')) {
    // For homework, first get lessons, then generate
    console.log('✍️ [ORCHESTRATOR] → Temporal Agent (for lessons) → Homework Agent');

    // Transform user query into a pure temporal query
    const temporalQuery = extractTemporalQuery(userQuery);
    console.log('✍️ [ORCHESTRATOR] Transformed query for temporal agent:', temporalQuery);

    const temporalResult = await runTemporalAgent(studentId, temporalQuery);

    // Extract lesson IDs from temporal agent's tool results
    const lessonIds = extractLessonIdsFromAgentResult(temporalResult);

    if (lessonIds.length === 0) {
      console.warn('⚠️ [ORCHESTRATOR] No lessons found by temporal agent');
      agentResult = {
        result: 'No lessons found for the specified time period.',
        toolCalls: [],
        usage: temporalResult.usage,
      };
    } else {
      console.log('✍️ [ORCHESTRATOR] Found', lessonIds.length, 'lessons, generating homework...');
      const homeworkResult = await runHomeworkAgent(lessonIds);

      // Combine usage stats
      agentResult = {
        result: homeworkResult.result,
        toolCalls: [...temporalResult.toolCalls, ...homeworkResult.toolCalls],
        usage: {
          inputTokens: (temporalResult.usage.inputTokens || 0) + (homeworkResult.usage.inputTokens || 0),
          outputTokens: (temporalResult.usage.outputTokens || 0) + (homeworkResult.usage.outputTokens || 0),
          totalTokens: (temporalResult.usage.totalTokens || 0) + (homeworkResult.usage.totalTokens || 0),
        },
      };
    }
  }
  else {
    // Default fallback: use RAG agent
    console.log('🔍 [ORCHESTRATOR] → RAG Agent (fallback)');
    agentResult = await runRagAgent(studentId, userQuery);
  }

  // Format final response - handle empty responses from agents
  let finalResponse = agentResult.result?.trim() || '';

  if (!finalResponse) {
    // Agent returned empty response - provide helpful fallback
    console.warn('⚠️ [ORCHESTRATOR] Agent returned empty response, using fallback');
    finalResponse = "عذراً، لم أتمكن من العثور على أي معلومات حول هذا الموضوع في دروسك المسجلة.\n\nSorry, I couldn't find any information about this in your recorded lessons.";
  }

  // Calculate total usage
  const totalUsage = {
    inputTokens: (routingDecision.usage.inputTokens || 0) + (agentResult.usage.inputTokens || 0),
    outputTokens: (routingDecision.usage.outputTokens || 0) + (agentResult.usage.outputTokens || 0),
    totalTokens: (routingDecision.usage.totalTokens || 0) + (agentResult.usage.totalTokens || 0),
  };

  console.log('💰 [ORCHESTRATOR] Total tokens:', totalUsage);
  console.log('✅ [ORCHESTRATOR] Response ready\n');

  return {
    response: finalResponse,
    toolCalls: agentResult.toolCalls,
    usage: totalUsage,
  };
}
