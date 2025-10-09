/**
 * AI Agent Tools Index
 * Exports all tools for the intelligent Arabic tutor agent
 */

// SQL Tools (Precise Temporal Queries)
export {
  getRecentLessons,
  getLessonByDate,
  getLessonsInDateRange,
  getAllVocabSince,
  searchExactWord,
  type Lesson,
} from './sql-tools';

// RAG Tools (Semantic Search)
export {
  searchLessonsByTopic,
  searchGrammarTopics,
  type SearchResult,
} from './rag-tools';

// Generation Tools (AI Content Creation)
export {
  generateHomeworkFromLessons,
  generateSummaryOfSummaries,
} from './generation-tools';
