"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthFormState } from "./state";

export async function signInAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  if (!email || !password) {
    return { message: "Email and password are required.", messageType: "error" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { message: error.message, messageType: "error" };
    }
  } catch (error) {
    console.error("signInAction", error);
    return { message: "Unable to sign in. Check configuration.", messageType: "error" };
  }

  redirect("/dashboard");
}

export async function signUpAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  if (!email || !password) {
    return { message: "Email and password are required.", messageType: "error" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name || null,
        },
      },
    });

    if (error) {
      return { message: error.message, messageType: "error" };
    }

    // If no session was created, email confirmation is required
    if (!data.session) {
      redirect("/auth/confirm-email");
    }
  } catch (error) {
    console.error("signUpAction", error);
    return { message: "Unable to sign up. Check configuration.", messageType: "error" };
  }

  // If a session was created (email confirmation disabled), go to dashboard
  redirect("/dashboard");
}

export async function signOutAction() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.warn("signOutAction", error);
  }

  redirect("/auth/sign-in");
}
