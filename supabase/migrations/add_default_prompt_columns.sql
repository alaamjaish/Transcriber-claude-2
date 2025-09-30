-- Add default prompt columns to teacher_preferences table
ALTER TABLE public.teacher_preferences
ADD COLUMN IF NOT EXISTS default_summary_prompt_id uuid REFERENCES public.prompts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS default_homework_prompt_id uuid REFERENCES public.prompts(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN public.teacher_preferences.default_summary_prompt_id IS 'Default prompt to use for generating summaries';
COMMENT ON COLUMN public.teacher_preferences.default_homework_prompt_id IS 'Default prompt to use for generating homework';
