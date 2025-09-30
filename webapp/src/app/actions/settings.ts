"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function saveDefaultPromptsAction(
  summaryPromptId: string | null,
  homeworkPromptId: string | null
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  // Upsert user preferences
  const { error } = await supabase
    .from("teacher_preferences")
    .upsert({
      user_id: user.id,
      default_summary_prompt_id: summaryPromptId,
      default_homework_prompt_id: homeworkPromptId,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id"
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/recordings");
  revalidatePath("/students");
}