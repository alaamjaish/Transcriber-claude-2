-- Check what date format Gerard's Oct 4 lesson has
SELECT 
  id,
  created_at,
  DATE(created_at) as lesson_date,
  to_char(created_at, 'YYYY-MM-DD') as formatted_date,
  substring(summary_md, 1, 100) as summary_preview
FROM sessions
WHERE student_id = '4ea94b26-2e58-453c-aa0c-9625bb29a3d0'
  AND created_at >= '2025-10-01'
  AND created_at < '2025-10-10'
ORDER BY created_at DESC;
