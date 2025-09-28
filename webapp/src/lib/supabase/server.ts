import type { CookieOptions } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";

type MutableCookieStore = {
  get: (name: string) => { value: string } | undefined;
  set?: (name: string, value: string, options?: CookieOptions) => void;
  delete?: (name: string, options?: CookieOptions) => void;
};

export async function createSupabaseServerClient() {
  const cookieStore = await cookies() as unknown as MutableCookieStore;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        if (typeof cookieStore.set !== "function") {
          logCookieWarning("set");
          return;
        }

        try {
          cookieStore.set(name, value, normalizeOptions(options));
        } catch (error) {
          logCookieWarning("set", error);
        }
      },
      remove(name, options) {
        if (typeof cookieStore.delete !== "function") {
          logCookieWarning("delete");
          return;
        }

        try {
          cookieStore.delete(name, normalizeOptions(options));
        } catch (error) {
          logCookieWarning("delete", error);
        }
      },
    },
  });
}

function normalizeOptions(options?: CookieOptions) {
  if (!options) return { path: "/" } satisfies CookieOptions;
  return { path: "/", ...options } satisfies CookieOptions;
}

function logCookieWarning(action: "set" | "delete", error?: unknown) {
  if (process.env.NODE_ENV === "production") return;
  const base =
    action === "set"
      ? "Supabase attempted to set auth cookies outside of a mutating context."
      : "Supabase attempted to delete auth cookies outside of a mutating context.";
  console.warn(`${base} Run this inside a Server Action or Route Handler to persist cookies.`, error);
}
