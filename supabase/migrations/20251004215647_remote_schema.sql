create extension if not exists "vector" with schema "public" version '0.8.0';

revoke delete on table "public"."ai_chat_messages" from "anon";

revoke insert on table "public"."ai_chat_messages" from "anon";

revoke references on table "public"."ai_chat_messages" from "anon";

revoke select on table "public"."ai_chat_messages" from "anon";

revoke trigger on table "public"."ai_chat_messages" from "anon";

revoke truncate on table "public"."ai_chat_messages" from "anon";

revoke update on table "public"."ai_chat_messages" from "anon";

revoke delete on table "public"."ai_chat_messages" from "authenticated";

revoke insert on table "public"."ai_chat_messages" from "authenticated";

revoke references on table "public"."ai_chat_messages" from "authenticated";

revoke select on table "public"."ai_chat_messages" from "authenticated";

revoke trigger on table "public"."ai_chat_messages" from "authenticated";

revoke truncate on table "public"."ai_chat_messages" from "authenticated";

revoke update on table "public"."ai_chat_messages" from "authenticated";

revoke delete on table "public"."ai_chat_messages" from "service_role";

revoke insert on table "public"."ai_chat_messages" from "service_role";

revoke references on table "public"."ai_chat_messages" from "service_role";

revoke select on table "public"."ai_chat_messages" from "service_role";

revoke trigger on table "public"."ai_chat_messages" from "service_role";

revoke truncate on table "public"."ai_chat_messages" from "service_role";

revoke update on table "public"."ai_chat_messages" from "service_role";

revoke delete on table "public"."ai_chat_sessions" from "anon";

revoke insert on table "public"."ai_chat_sessions" from "anon";

revoke references on table "public"."ai_chat_sessions" from "anon";

revoke select on table "public"."ai_chat_sessions" from "anon";

revoke trigger on table "public"."ai_chat_sessions" from "anon";

revoke truncate on table "public"."ai_chat_sessions" from "anon";

revoke update on table "public"."ai_chat_sessions" from "anon";

revoke delete on table "public"."ai_chat_sessions" from "authenticated";

revoke insert on table "public"."ai_chat_sessions" from "authenticated";

revoke references on table "public"."ai_chat_sessions" from "authenticated";

revoke select on table "public"."ai_chat_sessions" from "authenticated";

revoke trigger on table "public"."ai_chat_sessions" from "authenticated";

revoke truncate on table "public"."ai_chat_sessions" from "authenticated";

revoke update on table "public"."ai_chat_sessions" from "authenticated";

revoke delete on table "public"."ai_chat_sessions" from "service_role";

revoke insert on table "public"."ai_chat_sessions" from "service_role";

revoke references on table "public"."ai_chat_sessions" from "service_role";

revoke select on table "public"."ai_chat_sessions" from "service_role";

revoke trigger on table "public"."ai_chat_sessions" from "service_role";

revoke truncate on table "public"."ai_chat_sessions" from "service_role";

revoke update on table "public"."ai_chat_sessions" from "service_role";

revoke delete on table "public"."prompts" from "anon";

revoke insert on table "public"."prompts" from "anon";

revoke references on table "public"."prompts" from "anon";

revoke select on table "public"."prompts" from "anon";

revoke trigger on table "public"."prompts" from "anon";

revoke truncate on table "public"."prompts" from "anon";

revoke update on table "public"."prompts" from "anon";

revoke delete on table "public"."prompts" from "authenticated";

revoke insert on table "public"."prompts" from "authenticated";

revoke references on table "public"."prompts" from "authenticated";

revoke select on table "public"."prompts" from "authenticated";

revoke trigger on table "public"."prompts" from "authenticated";

revoke truncate on table "public"."prompts" from "authenticated";

revoke update on table "public"."prompts" from "authenticated";

revoke delete on table "public"."prompts" from "service_role";

revoke insert on table "public"."prompts" from "service_role";

revoke references on table "public"."prompts" from "service_role";

revoke select on table "public"."prompts" from "service_role";

revoke trigger on table "public"."prompts" from "service_role";

revoke truncate on table "public"."prompts" from "service_role";

revoke update on table "public"."prompts" from "service_role";

revoke delete on table "public"."sessions" from "anon";

revoke insert on table "public"."sessions" from "anon";

revoke references on table "public"."sessions" from "anon";

revoke select on table "public"."sessions" from "anon";

revoke trigger on table "public"."sessions" from "anon";

revoke truncate on table "public"."sessions" from "anon";

revoke update on table "public"."sessions" from "anon";

revoke delete on table "public"."sessions" from "authenticated";

revoke insert on table "public"."sessions" from "authenticated";

revoke references on table "public"."sessions" from "authenticated";

revoke select on table "public"."sessions" from "authenticated";

revoke trigger on table "public"."sessions" from "authenticated";

revoke truncate on table "public"."sessions" from "authenticated";

revoke update on table "public"."sessions" from "authenticated";

revoke delete on table "public"."sessions" from "service_role";

revoke insert on table "public"."sessions" from "service_role";

revoke references on table "public"."sessions" from "service_role";

revoke select on table "public"."sessions" from "service_role";

revoke trigger on table "public"."sessions" from "service_role";

revoke truncate on table "public"."sessions" from "service_role";

revoke update on table "public"."sessions" from "service_role";

revoke delete on table "public"."students" from "anon";

revoke insert on table "public"."students" from "anon";

revoke references on table "public"."students" from "anon";

revoke select on table "public"."students" from "anon";

revoke trigger on table "public"."students" from "anon";

revoke truncate on table "public"."students" from "anon";

revoke update on table "public"."students" from "anon";

revoke delete on table "public"."students" from "authenticated";

revoke insert on table "public"."students" from "authenticated";

revoke references on table "public"."students" from "authenticated";

revoke select on table "public"."students" from "authenticated";

revoke trigger on table "public"."students" from "authenticated";

revoke truncate on table "public"."students" from "authenticated";

revoke update on table "public"."students" from "authenticated";

revoke delete on table "public"."students" from "service_role";

revoke insert on table "public"."students" from "service_role";

revoke references on table "public"."students" from "service_role";

revoke select on table "public"."students" from "service_role";

revoke trigger on table "public"."students" from "service_role";

revoke truncate on table "public"."students" from "service_role";

revoke update on table "public"."students" from "service_role";

revoke delete on table "public"."teacher_preferences" from "anon";

revoke insert on table "public"."teacher_preferences" from "anon";

revoke references on table "public"."teacher_preferences" from "anon";

revoke select on table "public"."teacher_preferences" from "anon";

revoke trigger on table "public"."teacher_preferences" from "anon";

revoke truncate on table "public"."teacher_preferences" from "anon";

revoke update on table "public"."teacher_preferences" from "anon";

revoke delete on table "public"."teacher_preferences" from "authenticated";

revoke insert on table "public"."teacher_preferences" from "authenticated";

revoke references on table "public"."teacher_preferences" from "authenticated";

revoke select on table "public"."teacher_preferences" from "authenticated";

revoke trigger on table "public"."teacher_preferences" from "authenticated";

revoke truncate on table "public"."teacher_preferences" from "authenticated";

revoke update on table "public"."teacher_preferences" from "authenticated";

revoke delete on table "public"."teacher_preferences" from "service_role";

revoke insert on table "public"."teacher_preferences" from "service_role";

revoke references on table "public"."teacher_preferences" from "service_role";

revoke select on table "public"."teacher_preferences" from "service_role";

revoke trigger on table "public"."teacher_preferences" from "service_role";

revoke truncate on table "public"."teacher_preferences" from "service_role";

revoke update on table "public"."teacher_preferences" from "service_role";

revoke delete on table "public"."tutor_settings" from "anon";

revoke insert on table "public"."tutor_settings" from "anon";

revoke references on table "public"."tutor_settings" from "anon";

revoke select on table "public"."tutor_settings" from "anon";

revoke trigger on table "public"."tutor_settings" from "anon";

revoke truncate on table "public"."tutor_settings" from "anon";

revoke update on table "public"."tutor_settings" from "anon";

revoke delete on table "public"."tutor_settings" from "authenticated";

revoke insert on table "public"."tutor_settings" from "authenticated";

revoke references on table "public"."tutor_settings" from "authenticated";

revoke select on table "public"."tutor_settings" from "authenticated";

revoke trigger on table "public"."tutor_settings" from "authenticated";

revoke truncate on table "public"."tutor_settings" from "authenticated";

revoke update on table "public"."tutor_settings" from "authenticated";

revoke delete on table "public"."tutor_settings" from "service_role";

revoke insert on table "public"."tutor_settings" from "service_role";

revoke references on table "public"."tutor_settings" from "service_role";

revoke select on table "public"."tutor_settings" from "service_role";

revoke trigger on table "public"."tutor_settings" from "service_role";

revoke truncate on table "public"."tutor_settings" from "service_role";

revoke update on table "public"."tutor_settings" from "service_role";

create table "public"."contento" (
    "id" uuid not null default gen_random_uuid(),
    "content" text,
    "embedding" vector(1536),
    "metadata" jsonb
);


create table "public"."lesson_collections" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "student_id" uuid not null,
    "name" text not null,
    "description" text,
    "lesson_ids" uuid[] not null default '{}'::uuid[],
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."lesson_collections" enable row level security;

alter table "public"."sessions" add column "combined_content" text;

alter table "public"."sessions" add column "homework_embedding" vector(1536);

alter table "public"."sessions" add column "summary_embedding" vector(1536);

CREATE UNIQUE INDEX contento_pkey ON public.contento USING btree (id);

CREATE UNIQUE INDEX lesson_collections_pkey ON public.lesson_collections USING btree (id);

CREATE INDEX lesson_collections_student_idx ON public.lesson_collections USING btree (student_id, updated_at DESC);

CREATE INDEX lesson_collections_user_idx ON public.lesson_collections USING btree (user_id, updated_at DESC);

CREATE INDEX sessions_homework_embedding_idx ON public.sessions USING hnsw (homework_embedding vector_cosine_ops) WITH (m='16', ef_construction='64');

CREATE INDEX sessions_student_id_idx ON public.sessions USING btree (student_id);

CREATE INDEX sessions_summary_embedding_idx ON public.sessions USING hnsw (summary_embedding vector_cosine_ops) WITH (m='16', ef_construction='64');

alter table "public"."contento" add constraint "contento_pkey" PRIMARY KEY using index "contento_pkey";

alter table "public"."lesson_collections" add constraint "lesson_collections_pkey" PRIMARY KEY using index "lesson_collections_pkey";

alter table "public"."lesson_collections" add constraint "lesson_collections_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE not valid;

alter table "public"."lesson_collections" validate constraint "lesson_collections_student_id_fkey";

alter table "public"."lesson_collections" add constraint "lesson_collections_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."lesson_collections" validate constraint "lesson_collections_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.hybrid_search_lessons(query_embedding vector, target_student_id uuid, match_count integer DEFAULT 10, min_similarity double precision DEFAULT 0.7)
 RETURNS TABLE(id uuid, similarity double precision, recency_score double precision, final_score double precision, summary_md text, homework_md text, transcript text, created_at timestamp with time zone, "timestamp" timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  WITH similarity_scores AS (
    SELECT
      s.id,
      s.student_id,
      GREATEST(
        CASE
          WHEN s.summary_embedding IS NOT NULL
          THEN 1 - (s.summary_embedding <=> query_embedding)
          ELSE 0
        END,
        CASE
          WHEN s.homework_embedding IS NOT NULL
          THEN 1 - (s.homework_embedding <=> query_embedding)
          ELSE 0
        END
      ) AS sim_score,
      s.summary_md,
      s.homework_md,
      s.transcript,
      s.created_at,
      s."timestamp"
    FROM public.sessions s
    WHERE s.student_id = target_student_id
      AND (s.summary_embedding IS NOT NULL OR s.homework_embedding IS NOT NULL)
  ),
  recency_scores AS (
    SELECT
      s.id,
      (1.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - s.created_at)) / 86400.0))::double precision AS rec_score
    FROM public.sessions s
    WHERE s.student_id = target_student_id
  )
  SELECT
    ss.id,
    ss.sim_score::double precision AS similarity,
    rs.rec_score AS recency_score,
    (ss.sim_score * 0.8 + rs.rec_score * 0.2)::double precision AS final_score,
    ss.summary_md,
    ss.homework_md,
    ss.transcript,
    ss.created_at,
    ss."timestamp"
  FROM similarity_scores ss
  JOIN recency_scores rs ON ss.id = rs.id
  WHERE ss.sim_score >= min_similarity
  ORDER BY final_score DESC
  LIMIT match_count;
END;
$function$
;

create policy "Users can manage collections for own students"
on "public"."lesson_collections"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = lesson_collections.student_id) AND (students.owner_user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = lesson_collections.student_id) AND (students.owner_user_id = auth.uid())))));



CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


