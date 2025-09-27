"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Student } from "@/lib/types";

function normaliseName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export async function listStudentsAction(): Promise<Student[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const { data, error: listError } = await supabase
    .from("students")
    .select("id, name, created_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false });

  if (listError) {
    throw new Error(listError.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    totalSessions: undefined,
  }));
}

export async function createStudentAction(name: string): Promise<Student> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const cleaned = normaliseName(name);
  if (!cleaned) {
    throw new Error("Student name is required");
  }

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("students")
    .select("id, name, created_at")
    .eq("owner_user_id", user.id)
    .ilike("name", cleaned)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      createdAt: existing.created_at,
      totalSessions: undefined,
    };
  }

  const {
    data: inserted,
    error: insertError,
  } = await supabase
    .from("students")
    .insert([{ name: cleaned, owner_user_id: user.id }])
    .select("id, name, created_at")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath("/students");

  return {
    id: inserted.id,
    name: inserted.name,
    createdAt: inserted.created_at,
    totalSessions: undefined,
  };
}
