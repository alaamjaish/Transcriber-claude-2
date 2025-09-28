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
  revalidatePath("/dashboard");

  return {
    id: inserted.id,
    name: inserted.name,
    createdAt: inserted.created_at,
    totalSessions: undefined,
  };
}

export async function updateStudentAction(id: string, name: string): Promise<Student> {
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

  // Check if student exists and belongs to user
  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("students")
    .select("id, name, created_at")
    .eq("owner_user_id", user.id)
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existing) {
    throw new Error("Student not found");
  }

  // Check if name already exists for another student
  const {
    data: nameConflict,
    error: nameError,
  } = await supabase
    .from("students")
    .select("id")
    .eq("owner_user_id", user.id)
    .ilike("name", cleaned)
    .neq("id", id)
    .maybeSingle();

  if (nameError) {
    throw new Error(nameError.message);
  }

  if (nameConflict) {
    throw new Error("A student with this name already exists");
  }

  // Update the student
  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from("students")
    .update({ name: cleaned })
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .select("id, name, created_at")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/students");
  revalidatePath("/dashboard");

  return {
    id: updated.id,
    name: updated.name,
    createdAt: updated.created_at,
    totalSessions: undefined,
  };
}

export async function deleteStudentAction(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  // Check if student exists and belongs to user
  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("students")
    .select("id")
    .eq("owner_user_id", user.id)
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existing) {
    throw new Error("Student not found");
  }

  // Delete the student (sessions will be cascade deleted based on your schema)
  const { error: deleteError } = await supabase
    .from("students")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", user.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/students");
  revalidatePath("/dashboard");
}
