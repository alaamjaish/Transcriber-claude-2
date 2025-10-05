"use server";

import { revalidatePath } from "next/cache";

import { generateHomework, generateSummary } from "@/lib/ai/generate";
import { generateEmbedding, prepareCombinedContent } from "@/lib/ai/embeddings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface GenerationResult {
  summaryGenerated: boolean;
  homeworkGenerated: boolean;
  error?: string;
}

export async function generateSessionArtifactsAction(
  sessionId: string,
  options?: { summary?: boolean; homework?: boolean },
  userContext?: string,
  selectedPromptId?: string,
): Promise<GenerationResult> {
  // Normalize Next.js serialized undefined
  const normalizedPromptId = selectedPromptId === "$undefined" ? undefined : selectedPromptId;
  const normalizedContext = userContext === "$undefined" ? undefined : userContext;

// ADD THESE DEBUG LOGS:
console.log("🔍 SERVER ACTION RECEIVED:", {
  sessionId,
  options,
  userContext,
  selectedPromptId,
  normalizedContext,
  normalizedPromptId
});
  if (!sessionId) {
    throw new Error("Session ID is required");
  }

  const runSummary = options?.summary ?? true;
  const runHomework = options?.homework ?? true;

  if (!runSummary && !runHomework) {
    return { summaryGenerated: false, homeworkGenerated: false };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const {
    data: session,
    error: sessionError,
  } = await supabase
    .from("sessions")
    .select("id, transcript, student_id, summary_md, homework_md")
    .eq("id", sessionId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session) {
    throw new Error("Session not found");
  }

  const transcript = session.transcript ?? "";

  if (!transcript.trim()) {
    const emptyUpdates: {
      summary_md?: string | null;
      homework_md?: string | null;
      generation_status?: string | null;
      generation_started_at?: string | null;
    } = {};
    if (runSummary) emptyUpdates.summary_md = null;
    if (runHomework) emptyUpdates.homework_md = null;
    emptyUpdates.generation_status = "idle";
    emptyUpdates.generation_started_at = null;

    if (Object.keys(emptyUpdates).length > 0) {
      await supabase
        .from("sessions")
        .update(emptyUpdates)
        .eq("id", sessionId)
        .eq("owner_user_id", user.id);

      revalidatePath("/recordings");
      revalidatePath("/students");
      if (session.student_id) {
        revalidatePath(`/students/${session.student_id}`);
      }
    }

    return { summaryGenerated: false, homeworkGenerated: false };
  }

  let summaryPromptOverride: string | undefined;
  let homeworkPromptOverride: string | undefined;

  // If user manually selected a prompt, use it for both summary and homework
  if (normalizedPromptId) {
    const { data: promptRow, error: promptError } = await supabase
      .from("prompts")
      .select("prompt_text")
      .eq("id", normalizedPromptId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (promptError) {
      console.error("Failed to load selected prompt", promptError);
    } else if (promptRow?.prompt_text) {
      summaryPromptOverride = promptRow.prompt_text;
      homeworkPromptOverride = promptRow.prompt_text;
    } else {
      console.warn("Selected prompt not available for user", { selectedPromptId: normalizedPromptId, userId: user.id });
    }
  } else {
    // No manual selection - load user's default prompts
    const { data: prefsRaw, error: prefsError } = await supabase
      .from("teacher_preferences")
      .select("default_summary_prompt_id, default_homework_prompt_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const prefs = (prefsRaw ?? null) as {
      default_summary_prompt_id?: string | null;
      default_homework_prompt_id?: string | null;
    } | null;

    if (!prefsError && prefs) {
      const defaultSummaryId = prefs.default_summary_prompt_id ?? null;
      const defaultHomeworkId = prefs.default_homework_prompt_id ?? null;

      // Load default summary prompt if set
      if (runSummary && defaultSummaryId) {
        const { data: summaryPromptRow } = await supabase
          .from("prompts")
          .select("prompt_text")
          .eq("id", defaultSummaryId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (summaryPromptRow?.prompt_text) {
          summaryPromptOverride = summaryPromptRow.prompt_text;
        }
      }

      // Load default homework prompt if set
      if (runHomework && defaultHomeworkId) {
        const { data: homeworkPromptRow } = await supabase
          .from("prompts")
          .select("prompt_text")
          .eq("id", defaultHomeworkId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (homeworkPromptRow?.prompt_text) {
          homeworkPromptOverride = homeworkPromptRow.prompt_text;
        }
      }
    }
  }
  // Mark generation as started
  await supabase
    .from("sessions")
    .update({
      generation_status: "generating",
      generation_started_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("owner_user_id", user.id);

  // Force immediate UI update to show "generating" status
  revalidatePath("/recordings");
  revalidatePath("/students");
  if (session.student_id) {
    revalidatePath(`/students/${session.student_id}`);
  }

  const updates: {
    summary_md?: string | null;
    homework_md?: string | null;
    generation_status?: string;
    generation_started_at?: string | null;
    summary_embedding?: number[] | null;
    homework_embedding?: number[] | null;
    combined_content?: string;
    embeddings_generated_at?: string;
    embedding_model?: string;
  } = {};
  let errorMessage: string | undefined;
  let summaryGenerated = false;
  let homeworkGenerated = false;

  if (runSummary) {
    try {
      console.log("🎯 GENERATING SUMMARY with:", {
        transcriptLength: transcript.length,
        normalizedContext,
        hasSummaryPromptOverride: !!summaryPromptOverride
      });
      let summaryMd = await generateSummary(transcript, normalizedContext, summaryPromptOverride);

      // Validate and auto-fix summary structure
      const requiredHeadings = [
        '## Lesson Details',
        '## High-Level Summary',
        '## New Vocabulary',
        '## Key Expressions and Phrases',
        '## Main Grammatical Concepts Discussed',
        '## Homework'
      ];

      // Auto-fix common heading mistakes
      summaryMd = summaryMd
        .replace(/^## Vocabulary$/gm, '## New Vocabulary')
        .replace(/^## Summary$/gm, '## High-Level Summary')
        .replace(/^## Grammar$/gm, '## Main Grammatical Concepts Discussed');

      // Check if critical headings exist
      const missingHeadings = requiredHeadings.filter(h => !summaryMd.includes(h));
      if (missingHeadings.length > 0) {
        console.warn("⚠️ SUMMARY MISSING HEADINGS:", missingHeadings);
      }

      console.log("✅ SUMMARY GENERATED:", summaryMd.substring(0, 100));
      updates.summary_md = summaryMd;
      summaryGenerated = true;
    } catch (error) {
      console.error("❌ SUMMARY GENERATION ERROR:", error);
      updates.summary_md = null;
      const message = error instanceof Error ? error.message : String(error);
      errorMessage = errorMessage ? `${errorMessage}; ${message}` : message;
    }
  }

  if (runHomework) {
    try {
      console.log("🎯 GENERATING HOMEWORK with:", {
        transcriptLength: transcript.length,
        normalizedContext,
        hasHomeworkPromptOverride: !!homeworkPromptOverride
      });
      const homeworkMd = await generateHomework(transcript, normalizedContext, homeworkPromptOverride);
      console.log("✅ HOMEWORK GENERATED:", homeworkMd.substring(0, 100));
      updates.homework_md = homeworkMd;
      homeworkGenerated = true;
    } catch (error) {
      console.error("❌ HOMEWORK GENERATION ERROR:", error);
      updates.homework_md = null;
      const message = error instanceof Error ? error.message : String(error);
      errorMessage = errorMessage ? `${errorMessage}; ${message}` : message;
    }
  }

  // Set final status based on results
  console.log("📊 FINAL STATUS:", { summaryGenerated, homeworkGenerated, errorMessage, updates });
  if (errorMessage) {
    updates.generation_status = "error";
  } else if (summaryGenerated || homeworkGenerated) {
    updates.generation_status = "complete";
  } else {
    updates.generation_status = "idle";
  }
  updates.generation_started_at = null; // Clear started timestamp

  // Generate embeddings if summary or homework was created
  if (summaryGenerated || homeworkGenerated) {
    try {
      console.log("🔄 Generating embeddings...");

      const summaryText = updates.summary_md || session.summary_md || '';
      const homeworkText = updates.homework_md || session.homework_md || '';

      // Generate embeddings
      const summaryEmbedding = summaryText.trim()
        ? await generateEmbedding(summaryText)
        : null;

      const homeworkEmbedding = homeworkText.trim()
        ? await generateEmbedding(homeworkText)
        : null;

      const combinedContent = prepareCombinedContent(summaryText, homeworkText);

      // Add embeddings to updates
      updates.summary_embedding = summaryEmbedding;
      updates.homework_embedding = homeworkEmbedding;
      updates.combined_content = combinedContent;
      updates.embeddings_generated_at = new Date().toISOString();
      updates.embedding_model = 'text-embedding-3-small';

      console.log("✅ Embeddings generated successfully");
    } catch (embeddingError) {
      console.error("❌ Embedding generation failed (non-fatal):", embeddingError);
      // Don't fail the whole operation if embeddings fail
    }
  }

  if (Object.keys(updates).length > 0) {
    await supabase
      .from("sessions")
      .update(updates)
      .eq("id", sessionId)
      .eq("owner_user_id", user.id);

    revalidatePath("/recordings");
    revalidatePath("/students");
    if (session.student_id) {
      revalidatePath(`/students/${session.student_id}`);
    }
  }

  return { summaryGenerated, homeworkGenerated, error: errorMessage };
}



