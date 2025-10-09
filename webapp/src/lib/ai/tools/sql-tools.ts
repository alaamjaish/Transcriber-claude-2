/**
 * SQL Retrieval Tools
 * Precise temporal queries using direct SQL functions
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface Lesson {
  id: string;
  student_id: string;
  created_at: string;
  summary_md: string | null;
  // REMOVED: homework_md, combined_content - not needed for queries (token bloat)
}

/**
 * Get the most recent N lessons for a student
 * Use case: "آخر 10 دروس" or "last 20 lessons"
 */
export async function getRecentLessons(
  studentId: string,
  count: number
): Promise<Lesson[]> {
  const supabase = await createSupabaseServerClient();

  // @ts-expect-error - RPC function exists in database but not in generated types
  const { data, error } = await supabase.rpc('get_recent_lessons', {
    target_student_id: studentId,
    lesson_count: count,
  });

  if (error) {
    console.error('[getRecentLessons] Error:', error);
    throw new Error(`Failed to get recent lessons: ${error.message}`);
  }

  return data || [];
}

/**
 * Get lesson from a specific date
 * Use case: "درس 17 سبتمبر" or "lesson from September 17th"
 */
export async function getLessonByDate(
  studentId: string,
  date: string
): Promise<Lesson | null> {
  const supabase = await createSupabaseServerClient();

  console.log('🔍 [getLessonByDate] Searching for lesson on date:', date);

  // @ts-expect-error - RPC function exists in database but not in generated types
  const { data, error } = await supabase.rpc('get_lesson_by_date', {
    target_student_id: studentId,
    target_date: date,
  });

  if (error) {
    console.error('❌ [getLessonByDate] Error:', error);
    throw new Error(`Failed to get lesson by date: ${error.message}`);
  }

  console.log('✅ [getLessonByDate] Results:', (data as Lesson[] | null)?.length || 0, 'lessons found');

  return (data as Lesson[] | null)?.[0] || null;
}

/**
 * Get all lessons within a date range
 * Use case: "دروس آخر 3 شهور" or "lessons from last 6 months"
 */
export async function getLessonsInDateRange(
  studentId: string,
  startDate: string,
  endDate: string
): Promise<Lesson[]> {
  const supabase = await createSupabaseServerClient();

  // @ts-expect-error - RPC function exists in database but not in generated types
  const { data, error } = await supabase.rpc('get_lessons_in_range', {
    target_student_id: studentId,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    console.error('[getLessonsInDateRange] Error:', error);
    throw new Error(`Failed to get lessons in range: ${error.message}`);
  }

  return data || [];
}

/**
 * Extract all vocabulary from lessons in the last N months
 * Use case: "كل المفردات من آخر 6 شهور" or "all vocab from January to March"
 */
export async function getAllVocabSince(
  studentId: string,
  months: number
): Promise<string[]> {
  const supabase = await createSupabaseServerClient();

  // Calculate start date
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // @ts-expect-error - RPC function exists in database but not in generated types
  const { data, error } = await supabase.rpc('extract_vocab_from_range', {
    target_student_id: studentId,
    start_date: startDate.toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });

  if (error) {
    console.error('[getAllVocabSince] Error:', error);
    throw new Error(`Failed to extract vocab: ${error.message}`);
  }

  // Return array of vocab items (the function returns rows with vocab sections)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any)?.map((row: any) => row.vocabulary).filter(Boolean) || [];
}

/**
 * Normalize Arabic text for search
 * Handles: ال prefix, hamza variants, ta marbuta
 */
function normalizeArabic(text: string): string {
  let normalized = text;

  // Normalize all hamza variants to alif (ا)
  normalized = normalized.replace(/[أإآ]/g, 'ا');

  // Normalize ta marbuta (ة) to heh (ه)
  normalized = normalized.replace(/ة/g, 'ه');

  // Remove diacritics (tashkeel)
  normalized = normalized.replace(/[\u064B-\u065F]/g, '');

  return normalized;
}

/**
 * Search for exact word/phrase in lesson content
 * Use case: "when did we learn طاولة?" or "find the word شباك"
 * Handles Arabic normalization (ال prefix, hamza variants, ta marbuta)
 */
export async function searchExactWord(
  studentId: string,
  keyword: string
): Promise<Lesson[]> {
  const supabase = await createSupabaseServerClient();

  console.log('🔍 [searchExactWord] Searching for:', keyword);

  // Normalize the search keyword
  const normalized = normalizeArabic(keyword);

  // Create multiple search patterns:
  // 1. Exact keyword
  // 2. Keyword without ال prefix
  // 3. Keyword with ال prefix
  const searchPatterns = [
    `%${keyword}%`,                           // Exact match
    `%${normalized}%`,                         // Normalized match
  ];

  // If keyword starts with ال, also search without it
  if (keyword.startsWith('ال')) {
    const withoutAl = keyword.substring(2);
    searchPatterns.push(`%${withoutAl}%`);
    searchPatterns.push(`%${normalizeArabic(withoutAl)}%`);
  } else {
    // If doesn't have ال, also search with it
    searchPatterns.push(`%ال${keyword}%`);
    searchPatterns.push(`%ال${normalized}%`);
  }

  console.log('🔍 [searchExactWord] Search patterns:', searchPatterns);

  // Search using OR conditions for all patterns
  let query = supabase
    .from('sessions')
    .select('id, student_id, created_at, summary_md')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  // Build OR condition for all patterns
  const orConditions = searchPatterns
    .map(pattern => `summary_md.ilike.${pattern}`)
    .join(',');

  query = query.or(orConditions);

  const { data, error } = await query.limit(10);

  if (error) {
    console.error('❌ [searchExactWord] Error:', error);
    throw new Error(`Failed to search for word: ${error.message}`);
  }

  console.log('✅ [searchExactWord] Found:', data?.length || 0, 'lessons');

  return data || [];
}
