import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signOutAction } from "@/app/auth/actions";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let supabase: SupabaseClient<Database> | null = null;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.warn("DashboardLayout", error);
  }

  let userEmail: string | undefined;

  if (supabase) {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.warn("Failed to fetch session", error);
      redirect("/auth/sign-in");
    }

    if (!session) {
      redirect("/auth/sign-in");
    }

    userEmail = session?.user?.email ?? undefined;
  } else {
    redirect("/auth/sign-in");
  }

  return (
    <AppShell
      title="Recording Workspace"
      subtitle="Monitor live transcription, manage students, and publish lesson artefacts."
      userEmail={userEmail}
      onSignOut={signOutAction}
    >
      {children}
    </AppShell>
  );
}
