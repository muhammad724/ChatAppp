import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { supabase } from "./supabase";
import { api, ApiError } from "./api";
import type { User } from "./types";

type AuthValue = {
  session: Session | null;
  profile: User | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      setProfile(await api<User>("/profile"));
    } catch (error) {
      if (error instanceof ApiError && error.code === "PROFILE_REQUIRED") {
        setProfile(null);
        return;
      }
      if (error instanceof ApiError && error.status === 401) {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        return;
      }
      if (error instanceof ApiError && error.code === "NETWORK_ERROR") {
        setProfile(null);
        return;
      }
      throw error;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) refreshProfile().finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setProfile(null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({
    session, profile, loading, refreshProfile,
    signOut: async () => { await supabase.auth.signOut(); }
  }), [session, profile, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used in AuthProvider");
  return context;
}
