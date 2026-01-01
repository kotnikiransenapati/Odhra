import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = 'user' | 'vendor' | 'admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  isVendor: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);

  const fetchRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching roles:', error);
        return;
      }

      const userRoles = data?.map((r) => r.role as AppRole) || [];
      setRoles(userRoles);
    } catch (err) {
      console.error('Error in fetchRoles:', err);
    }
  };

  const refreshRoles = async () => {
    if (user) {
      await fetchRoles(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Defer role fetching with setTimeout to prevent deadlock
        if (currentSession?.user) {
          setTimeout(() => {
            fetchRoles(currentSession.user.id);
          }, 0);
        } else {
          setRoles([]);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        fetchRoles(existingSession.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
  };

  const isAdmin = roles.includes('admin');
  const isVendor = roles.includes('vendor');

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        roles,
        isAdmin,
        isVendor,
        signOut,
        refreshRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
