import React, { useState, useEffect, createContext, useContext, PropsWithChildren, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { differenceInDays } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Updated Types
export type SubscriptionStatus = 'trial_active' | 'trial_expired' | 'subscribed';

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
  created_at: string; // Added to calculate trial start date
};

type AuthContextType = {
  session: Session | null;
  profile: Profile | null;
  workgroup: Workgroup | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  isStockGridLocked: boolean;
  setStockGridLocked: (locked: boolean) => void;
  // New context values
  subscriptionStatus: SubscriptionStatus;
  daysRemaining: number;
};

// 2. Updated Default Context Values
const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  workgroup: null,
  loading: true,
  refreshProfile: async () => {},
  isStockGridLocked: false,
  setStockGridLocked: () => {},
  subscriptionStatus: 'trial_active',
  daysRemaining: 14,
});

export function AuthProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  
  // State
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workgroup, setWorkgroup] = useState<Workgroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStockGridLocked, setStockGridLocked] = useState(false);
  
  // New State for Subscription
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('trial_active');
  const [daysRemaining, setDaysRemaining] = useState(14);

  const fetchProfileAndWorkgroup = useCallback(async (currentSession: Session) => {
    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .single();

      if (profileError) throw profileError;
      
      setProfile(profileData);

      // 2. Fetch Workgroup (if applicable)
      if (profileData?.workgroup_id) {
        // Updated Select: Added 'created_at' to query
        const { data: workgroupData, error: workgroupError } = await supabase
          .from('workgroups')
          .select('id, name, join_code, admin_passcode, created_at') 
          .eq('id', profileData.workgroup_id)
          .single();

        if (workgroupError) throw workgroupError;

        setWorkgroup(workgroupData);

        // --- 3. Calculate Trial Logic ---
        if (workgroupData?.created_at) {
          const createdAt = new Date(workgroupData.created_at);
          const now = new Date();
          
          // Using date-fns for cleaner math (since you imported it)
          const daysUsed = differenceInDays(now, createdAt);
          const trialLength = 14;

          if (daysUsed >= trialLength) {
            // Here you would also check if they have a 'subscribed' status in DB
            // For now, if > 14 days and no paid plan, it expires.
            setSubscriptionStatus('trial_expired');
            setDaysRemaining(0);
          } else {
            setSubscriptionStatus('trial_active');
            setDaysRemaining(trialLength - daysUsed);
          }
        }
      } else {
        setWorkgroup(null);
        // Reset trial status if no workgroup exists yet
        setSubscriptionStatus('trial_active');
        setDaysRemaining(14);
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
        setStockGridLocked,
        // Exposing new values
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