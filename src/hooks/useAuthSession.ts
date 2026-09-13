import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Single source of truth for "is there a session right now". Reads from
 * local storage via getSession() (fast, no network round-trip) and stays in
 * sync via onAuthStateChange. Every page/layout that needs to know "am I
 * logged in" should use this instead of calling supabase.auth.getSession()
 * or getUser() independently — doing that in multiple places is what causes
 * redirect races between /login and the dashboard.
 */
export function useAuthSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = not checked yet
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setChecked(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setChecked(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, isLoading: !checked };
}
