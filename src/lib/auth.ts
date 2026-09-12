import { supabase } from "@/integrations/supabase/client";

/**
 * The demo account is a REAL Supabase Auth user — not a UI bypass. Signing in
 * (or, on first-ever use, signing up) with this exact email triggers the
 * `handle_new_user()` database trigger, which marks the organization
 * `is_demo = true` and seeds real detection rules. Everything that follows
 * (endpoints, incidents, audit logs) is the analyst's own real data.
 */
export const DEMO_EMAIL = "demo.analyst@aegisx.app";
export const DEMO_PASSWORD = "AegisXDemo!2026";

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithPassword(email: string, password: string, fullName?: string) {
  const { error } = await supabase.auth.signUp(
    fullName
      ? { email, password, options: { data: { full_name: fullName } } }
      : { email, password },
  );
  if (error) throw error;
}

/**
 * Continue as Demo Analyst — real sign-in against a real account. If the
 * account doesn't exist yet (first time anyone has used it on this project),
 * it's created for real via signUp, which the DB trigger turns into a demo
 * organization automatically.
 */
export async function continueAsDemoAnalyst() {
  const signIn = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (!signIn.error) return;

  // Only fall through to sign-up if the failure looks like "no such user yet".
  const { error: signUpError, data } = await supabase.auth.signUp({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    options: { data: { full_name: "Demo Analyst" } },
  });
  if (signUpError) throw signUpError;

  if (!data.session) {
    // Project has email confirmation enabled — sign-up succeeded but no
    // session was issued yet. Try one more sign-in in case confirmation
    // isn't actually required for this project despite the flag.
    const retry = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (retry.error) {
      throw new Error(
        "Demo account created but requires email confirmation. Disable email confirmation for this Supabase project (Auth settings) or confirm the demo.analyst@aegisx.app account once, then try again.",
      );
    }
  }
}

export async function signOut() {
  await supabase.auth.signOut();
}
