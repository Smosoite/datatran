import React, { useState, useEffect, createContext, useContext, PropsWithChildren, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { differenceInDays, parseISO } from 'date-fns';
import { useRouter, useSegments } from 'expo-router';

// 1. Updated Types
export type SubscriptionStatus = 'trial_active' | 'trial_expired' | 'subscribed';

type Profile = {
  id: string;
  username: string;
  workgroup_id: string | null;
  role: string | null;
  trial_ends_at: string | null;
};

type Workgroup = {
  id: string;
  name: string;
  join_code: string;
  admin_passcode: string | null;
  created_at: string; 
};

type AuthContextType = {
  session: Session | null;
  profile: Profile | null;
  workgroup: Workgroup | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  isStockGridLocked: boolean;
  setStockGridLocked: (locked: boolean) => void;
  subscriptionStatus: SubscriptionStatus;
  daysRemaining: number;
};

// 2. Default Context Values
const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  workgroup: null,
  loading: true,
  refreshProfile: async () => {},
  isStockGridLocked: false,
  setStockGridLocked: () => {},
  subscriptionStatus: 'trial_active',
  daysRemaining: 7,
});

export function AuthProvider({ children }: PropsWithChildren) {
  // Removed routing hooks as they are not needed here and cause conflicts
  
  // State
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workgroup, setWorkgroup] = useState<Workgroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStockGridLocked, setStockGridLocked] = useState(false);
  
  // New State for Subscription
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('trial_active');
  const [daysRemaining, setDaysRemaining] = useState(7);

  const fetchProfileAndWorkgroup = useCallback(async (currentSession: Session) => {
    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, workgroup_id, role, trial_ends_at')
        .eq('id', currentSession.user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      
      setProfile(profileData);

      // --- 2. Calculate Trial Logic Based on Profile ---
      if (profileData?.trial_ends_at) {
          const trialEnd = parseISO(profileData.trial_ends_at);
          const now = new Date();
          
          // Calculate remaining days
          const diff = differenceInDays(trialEnd, now);
          
          if (now > trialEnd) {
              setSubscriptionStatus('trial_expired');
              setDaysRemaining(0);
          } else {
              setSubscriptionStatus('trial_active');
              setDaysRemaining(diff >= 0 ? diff : 0);
          }
      } else {
          setSubscriptionStatus('trial_active'); 
      }

      // 3. Fetch Workgroup (if applicable)
      if (profileData?.workgroup_id) {
        const { data: workgroupData, error: workgroupError } = await supabase
          .from('workgroups')
          .select('id, name, join_code, admin_passcode, created_at') 
          .eq('id', profileData.workgroup_id)
          .single();

        if (workgroupError) throw workgroupError;
        setWorkgroup(workgroupData);
      } else {
        setWorkgroup(null);
      }
      
    } catch (error) {
      console.error("Error fetching profile/workgroup:", error);
      setProfile(null);
      setWorkgroup(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session) {
      await fetchProfileAndWorkgroup(session);
    }
  }, [session, fetchProfileAndWorkgroup]);

  // Initial Data Load
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
        setProfile(null);
        setWorkgroup(null);
        setStockGridLocked(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfileAndWorkgroup]);

  // DELETED: The "Protection Logic" useEffect has been removed.
  // Routing is now handled exclusively in app/_layout.tsx

  return (
    <AuthContext.Provider 
      value={{ 
        session, 
        profile, 
        workgroup,
        loading, 
        refreshProfile,
        isStockGridLocked,
        setStockGridLocked,
        subscriptionStatus,
        daysRemaining
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};