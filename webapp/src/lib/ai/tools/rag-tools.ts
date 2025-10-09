/**
 * RAG (Retrieval-Augmented Generation) Tools
 * Semantic search using vector embeddings
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/ai/embeddings';

export interface SearchResult {
  id: string;
  student_id: string;
  created_at: string;
  summary_md: string | null;
  // REMOVED: homework_md, combined_content - not needed for RAG (token bloat)
  similarity: number;
}

/**
 * Search lessons by semantic topic/content
 * Use case: "متى تعلمنا شباك؟" or "when did we learn about windows?"
 * Use case: "دروس عن الطعام" or "lessons about food"
 */
export async function searchLessonsByTopic(
  studentId: string,
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const supabase = await createSupabaseServerClient();

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // @ts-expect-error - RPC function exists in database but not in generated types
  const { data, error } = await supabase.rpc('hybrid_search_lessons', {
    target_student_id: studentId,
    query_embedding: queryEmbedding,
    match_threshold: 0.3, // Minimum similarity score (30%)
    match_count: limit,
  });

  if (error) {
    console.error('[searchLessonsByTopic] Error:', error);
    throw new Error(`Failed to search lessons by topic: ${error.message}`);
  }

  return data || [];
}

/**
 * Search for specific grammar topics across all lessons
 * Use case: "دروس عن الماضي" or "lessons about past tense"
 * Use case: "كل دروس القواعد عن الأفعال" or "all grammar about verbs"
 */
export async function searchGrammarTopics(
  studentId: string,
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const supabase = await createSupabaseServerClient();

  // Generate embedding for the grammar query
  const queryEmbedding = await generateEmbedding(query);

  // @ts-expect-error - RPC function exists in database but not in generated types
  const { data, error } = await supabase.rpc('hybrid_search_lessons', {
    target_student_id: studentId,
    query_embedding: queryEmbedding,
    match_threshold: 0.35, // Slightly higher threshold for grammar (more precision)
    match_count: limit,
  });

  if (error) {
    console.error('[searchGrammarTopics] Error:', error);
    throw new Error(`Failed to search grammar topics: ${error.message}`);
  }

  // Filter results to only include lessons with grammar sections
  const results = ((data || []) as SearchResult[]).filter((lesson: SearchResult) => {
    const content = lesson.summary_md || '';
    return content.includes('## Main Grammatical Concepts') ||
           content.includes('Grammar') ||
           content.includes('قواعد');
  });

  return results;
}
