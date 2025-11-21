import React, { useState, useEffect, createContext, useContext, PropsWithChildren, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

type Profile = {
  id: string;
  username: string;
  workgroup_id: string | null;
  role: string | null;
};

type Workgroup = {
  id: string;
  name: string;
  join_code: string;
  admin_passcode: string | null;
};

type AuthContextType = {
  session: Session | null;
  profile: Profile | null;
  workgroup: Workgroup | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  isStockGridLocked: boolean;
  setStockGridLocked: (locked: boolean) => void;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  workgroup: null,
  loading: true,
  refreshProfile: async () => {},
  isStockGridLocked: false,
  setStockGridLocked: () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workgroup, setWorkgroup] = useState<Workgroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStockGridLocked, setStockGridLocked] = useState(false);

  // FIX: Removed the lines that set profile/workgroup to null at the start of the function.
  // This prevents the app from thinking the user is logged out during a refresh.
  const fetchProfileAndWorkgroup = useCallback(async (currentSession: Session) => {
    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .single();

      if (profileError) throw profileError;
      
      // Update profile state
      setProfile(profileData);

      // 2. Fetch Workgroup (if applicable)
      if (profileData?.workgroup_id) {
        const { data: workgroupData, error: workgroupError } = await supabase
          .from('workgroups')
          .select('id, name, join_code, admin_passcode')
          .eq('id', profileData.workgroup_id)
          .single();

        if (workgroupError) throw workgroupError;

        // Update workgroup state
        setWorkgroup(workgroupData);
      } else {
        setWorkgroup(null);
      }
    } catch (error) {
      console.error("Error fetching profile/workgroup:", error);
      // Only clear state on actual error
      setProfile(null);
      setWorkgroup(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session) {
      await fetchProfileAndWorkgroup(session);
    }
  }, [session, fetchProfileAndWorkgroup]);

  useEffect(() => {
    const getInitialData = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      if (initialSession) {
        await fetchProfileAndWorkgroup(initialSession);
      }
      setLoading(false);
    };

    getInitialData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        await fetchProfileAndWorkgroup(newSession);
      } else {
        // Only clear everything on actual logout/session loss
        setProfile(null);
        setWorkgroup(null);
        setStockGridLocked(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfileAndWorkgroup]);

  return (
    <AuthContext.Provider 
      value={{ 
        session, 
        profile, 
        workgroup,
        loading, 
        refreshProfile,
        isStockGridLocked,
        setStockGridLocked
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};