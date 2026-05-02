import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    const applySession = (s: Session | null) => {
      if (cancelled) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    };

    // 1) Hydrate from persisted storage
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          applySession(null);
          return;
        }
        applySession(data.session ?? null);
      })
      .catch(() => applySession(null));

    // 2) Keep in sync with auth state changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, s: Session | null) => {
      // Supabase can emit INITIAL_SESSION; treat it as authoritative and end loading.
      if (event === "INITIAL_SESSION") {
        applySession(s);
        return;
      }

      setSession(s);
      setUser(s?.user ?? null);

      // Ensure we never get stuck in loading during transitions.
      if (loading) setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      session,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [user, session, loading]
  );

  return (
    <Ctx.Provider value={value}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
