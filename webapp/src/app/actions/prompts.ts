"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Prompt } from "@/lib/types";

function normaliseText(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export async function listPromptsAction(): Promise<Prompt[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const { data, error: listError } = await supabase
    .from("prompts")
    .select("id, name, prompt_text, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (listError) {
    throw new Error(listError.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: user.id,
    name: row.name,
    promptText: row.prompt_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createPromptAction(name: string, promptText: string): Promise<Prompt> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const cleanedName = normaliseText(name);
  const cleanedPromptText = normaliseText(promptText);

  if (!cleanedName) {
    throw new Error("Prompt name is required");
  }

  if (!cleanedPromptText) {
    throw new Error("Prompt text is required");
  }

  // Check for duplicate names
  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("prompts")
    .select("id")
    .eq("user_id", user.id)
    .ilike("name", cleanedName)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    throw new Error("A prompt with this name already exists");
  }

  const {
    data: inserted,
    error: insertError,
  } = await supabase
    .from("prompts")
    .insert([{
      name: cleanedName,
      prompt_text: cleanedPromptText,
      user_id: user.id
    }])
    .select("id, name, prompt_text, created_at, updated_at")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath("/prompts");

  return {
    id: inserted.id,
    userId: user.id,
    name: inserted.name,
    promptText: inserted.prompt_text,
    createdAt: inserted.created_at,
    updatedAt: inserted.updated_at,
  };
}

export async function updatePromptAction(id: string, name: string, promptText: string): Promise<Prompt> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const cleanedName = normaliseText(name);
  const cleanedPromptText = normaliseText(promptText);

  if (!cleanedName) {
    throw new Error("Prompt name is required");
  }

  if (!cleanedPromptText) {
    throw new Error("Prompt text is required");
  }

  // Check for duplicate names (excluding current prompt)
  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("prompts")
    .select("id")
    .eq("user_id", user.id)
    .ilike("name", cleanedName)
    .neq("id", id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    throw new Error("A prompt with this name already exists");
  }

  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from("prompts")
    .update({
      name: cleanedName,
      prompt_text: cleanedPromptText,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, name, prompt_text, created_at, updated_at")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/prompts");

  return {
    id: updated.id,
    userId: user.id,
    name: updated.name,
    promptText: updated.prompt_text,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

export async function deletePromptAction(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const { error: deleteError } = await supabase
    .from("prompts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/prompts");
}