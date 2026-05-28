import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setSession(session);
        setLoading(false);
        return;
      }

      // Auto sign-in with shared family credentials so all devices use the same account.
      // Set EXPO_PUBLIC_APP_EMAIL and EXPO_PUBLIC_APP_PASSWORD in Vercel + .env.local.
      const email = process.env.EXPO_PUBLIC_APP_EMAIL;
      const password = process.env.EXPO_PUBLIC_APP_PASSWORD;

      if (email && password) {
        const { data } = await supabase.auth.signInWithPassword({ email, password });
        setSession(data.session);
      } else {
        const { data } = await supabase.auth.signInAnonymously();
        setSession(data.session);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
