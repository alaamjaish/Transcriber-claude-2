/**
 * Generation Tools
 * AI-powered content creation from retrieved lessons
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface Lesson {
  id: string;
  created_at: string;
  summary_md: string | null;
  // REMOVED: homework_md - not fetched anymore to reduce token bloat
}

/**
 * Generate custom homework from a set of lessons
 * Use case: "أعطني واجب من آخر 5 دروس" or "create homework from last 5 lessons"
 */
export async function generateHomeworkFromLessons(
  lessons: Lesson[]
): Promise<string> {
  if (lessons.length === 0) {
    throw new Error('No lessons provided for homework generation');
  }

  // Build context from lessons
  const lessonContext = lessons
    .map((lesson, idx) => {
      const date = new Date(lesson.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const summary = lesson.summary_md || 'No summary available';
      return `### Lesson ${idx + 1} (${date})\n${summary}`;
    })
    .join('\n\n---\n\n');

  const prompt = `You are an Arabic language tutor. Based on the following lesson summaries, create a comprehensive homework assignment in Arabic.

The homework should:
1. Review vocabulary from these lessons
2. Practice grammar concepts covered
3. Include varied exercises (fill-in-the-blank, translation, sentence construction)
4. Be appropriate for the student's level based on the lesson content
5. Be written entirely in Arabic (except instructions if needed)

# Lesson Summaries

${lessonContext}

# Task

Generate a homework assignment in markdown format with clear sections for:
- مفردات (Vocabulary review)
- قواعد (Grammar exercises)
- تمارين (Practice exercises)
- كتابة (Writing task)

Return ONLY the homework content in Arabic, formatted in markdown.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return content.text;
}

/**
 * Generate a meta-summary (summary of summaries) from multiple lessons
 * Use case: "لخص لي آخر 3 شهور" or "summarize the last 3 months"
 */
export async function generateSummaryOfSummaries(
  lessons: Lesson[]
): Promise<string> {
  if (lessons.length === 0) {
    throw new Error('No lessons provided for summary generation');
  }

  // Build context from lessons
  const lessonContext = lessons
    .map((lesson, idx) => {
      const date = new Date(lesson.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const summary = lesson.summary_md || 'No summary available';
      return `### Lesson ${idx + 1} (${date})\n${summary}`;
    })
    .join('\n\n---\n\n');

  const prompt = `You are an Arabic language tutor. Based on the following lesson summaries, create a comprehensive overview that synthesizes the learning progress.

The meta-summary should:
1. Identify main themes and topics covered across all lessons
2. Track grammar progression (which concepts were introduced and built upon)
3. Highlight key vocabulary areas and semantic fields
4. Note any patterns in learning (repetition, difficulty areas, strengths)
5. Provide an overall assessment of progress

# Lesson Summaries

${lessonContext}

# Task

Generate a meta-summary in markdown format with the following sections:

## نظرة عامة (Overview)
Brief overview of the learning period

## المواضيع الرئيسية (Main Topics)
Key topics and themes covered

## تطور القواعد (Grammar Progression)
How grammar concepts developed over time

## المفردات الأساسية (Core Vocabulary)
Main vocabulary areas and semantic fields

## التقدم والملاحظات (Progress & Notes)
Overall progress assessment and observations

Write in a mix of Arabic and English where appropriate. Return ONLY the meta-summary in markdown format.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 6000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return content.text;
}
