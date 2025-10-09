-- Check if Gerard has embeddings
SELECT 
  s.id,
  s.created_at::date as lesson_date,
  CASE WHEN s.embedding IS NOT NULL THEN 'YES' ELSE 'NO' END as has_embedding,
  CASE WHEN s.summary_md IS NOT NULL THEN 'YES' ELSE 'NO' END as has_summary,
  substring(s.summary_md, 1, 100) as summary_preview
FROM sessions s
WHERE s.student_id = '4ea94b26-2e58-453c-aa0c-9625bb29a3d0'  -- Gerard's ID
ORDER BY s.created_at DESC
LIMIT 10;
