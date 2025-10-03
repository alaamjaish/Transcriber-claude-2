import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Session, TutorSettings } from '@/lib/types';

interface AIContextData {
  systemInstruction: string;
  lessonsCount: number;
}

/**
 * Build the system instruction for the AI tutor
 * Includes: base instructions + teaching methodology + last 30 lessons
 */
export async function buildAITutorContext(
  studentId: string,
  userId: string
): Promise<AIContextData> {
  let tutorSettings = await fetchTutorSettings(userId);

  // If no settings exist, create with default
  if (!tutorSettings) {
    tutorSettings = await createDefaultTutorSettings(userId);
  }

  // 2. Fetch last 30 lessons for this student
  const lessons = await fetchLast30Lessons(studentId);

  // 3. Build the system instruction
  const systemInstruction = buildSystemPrompt(
    tutorSettings.teachingMethodology,
    lessons
  );

  return {
    systemInstruction,
    lessonsCount: lessons.length,
  };
}

/**
 * Fetch tutor settings from database
 */
async function fetchTutorSettings(
  userId: string
): Promise<TutorSettings | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('tutor_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = not found, which is okay
    console.error('Error fetching tutor settings:', error);
    throw new Error('Failed to fetch tutor settings');
  }

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    teachingMethodology: data.teaching_methodology,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Create default tutor settings for a user
 */
async function createDefaultTutorSettings(
  userId: string
): Promise<TutorSettings> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('tutor_settings')
    .insert({ user_id: userId })
    .select()
    .single();

  if (error) {
    console.error('Error creating tutor settings:', error);
    throw new Error('Failed to create tutor settings');
  }

  return {
    id: data.id,
    userId: data.user_id,
    teachingMethodology: data.teaching_methodology,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Fetch last 30 lessons (sessions) for a student
 */
async function fetchLast30Lessons(studentId: string): Promise<Session[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Error fetching lessons:', error);
    throw new Error('Failed to fetch lessons');
  }

  return (
    data?.map((row) => ({
      id: row.id,
      studentId: row.student_id,
      recordedAt: row.timestamp,
      durationMs: row.duration_ms,
      transcript: row.transcript,
      transcriptPreview: row.transcript.slice(0, 100),
      summaryMd: row.summary_md,
      homeworkMd: row.homework_md,
      generationStatus: (row.generation_status || 'idle') as 'idle' | 'generating' | 'complete' | 'empty' | 'error',
      summaryReady: !!row.summary_md,
      homeworkReady: !!row.homework_md,
      aiGenerationStatus: row.generation_status,
      aiGenerationStartedAt: row.generation_started_at,
    })) || []
  );
}

/**
 * Build the complete system prompt for AI models
 */
function buildSystemPrompt(
  teachingMethodology: string,
  lessons: Session[]
): string {
  const baseInstructions = `You are an expert AI tutor assistant helping a teacher manage their students.

# Your Role
- Suggest next lesson plans based on student progress
- Generate homework assignments aligned with curriculum
- Identify knowledge gaps and recommend review topics
- Help teacher plan next 3-5 lessons
- Provide insights on student's learning trajectory

# Guidelines
- Always reference specific lesson numbers when making suggestions
- Be concise but thorough in your recommendations
- Generate content in Arabic when requested
- Use the curriculum structure to understand what was likely covered in earlier lessons
- Focus on actionable advice and practical suggestions
`;

  const methodologySection = `\n# Teaching Methodology & Curriculum Structure\n${teachingMethodology}\n`;

  const lessonsSection = buildLessonsContext(lessons);

  const currentDate = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `Current Date/Time: ${currentDate}\n\n${baseInstructions}${methodologySection}${lessonsSection}`;
}

/**
 * Build the lessons context section
 */
function buildLessonsContext(lessons: Session[]): string {
  if (lessons.length === 0) {
    return '\n# Student Progress\nNo lessons recorded yet for this student.\n';
  }

  const lessonsText = lessons
    .reverse() // Show oldest to newest
    .map((lesson, index) => {
      const lessonNumber = index + 1;
      const date = new Date(lesson.recordedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      let lessonInfo = `## Lesson ${lessonNumber} (${date})\n`;

      if (lesson.summaryMd) {
        lessonInfo += `**Summary:**\n${lesson.summaryMd}\n\n`;
      }

      if (lesson.homeworkMd) {
        lessonInfo += `**Homework:**\n${lesson.homeworkMd}\n\n`;
      }

      if (!lesson.summaryMd && !lesson.homeworkMd) {
        lessonInfo += `**Transcript Preview:** ${lesson.transcriptPreview}...\n\n`;
      }

      return lessonInfo;
    })
    .join('\n');

  return `\n# Student's Recent Progress (Last ${lessons.length} Lessons)\n\n${lessonsText}`;
}

/**
 * Update tutor settings (teaching methodology)
 */
export async function updateTutorMethodology(
  userId: string,
  methodology: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('tutor_settings')
    .update({
      teaching_methodology: methodology,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating tutor settings:', error);
    throw new Error('Failed to update teaching methodology');
  }
}
