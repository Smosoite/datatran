import React, { useState, useEffect, createContext, useContext, PropsWithChildren, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { differenceInDays, parseISO, addDays } from 'date-fns';
import { useRouter } from 'expo-router'; // Added useRouter just in case you need explicit navigation
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Types
export type SubscriptionStatus = 'trial_active' | 'trial_expired' | 'subscribed' | 'none';

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
  signOut: () => Promise<void>; // Exposed signOut to context
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
  signOut: async () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
  // State
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workgroup, setWorkgroup] = useState<Workgroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStockGridLocked, setStockGridLocked] = useState(false);
   
  // New State for Subscription
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('trial_active');
  const [daysRemaining, setDaysRemaining] = useState(7);

  const router = useRouter(); 

  // Helper to Sign Out
  const signOut = async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange listener below will handle state cleanup
  };

  const fetchProfileAndWorkgroup = useCallback(async (currentSession: Session) => {
    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, workgroup_id, role, trial_ends_at')
        .eq('id', currentSession.user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      
      // Check for pending trial activation (from Onboarding)
      const pendingTrial = await AsyncStorage.getItem('PENDING_TRIAL_START');
      if (pendingTrial === 'true' && profileData) {
         const newTrialDate = addDays(new Date(), 7).toISOString();
         const { error: updateError } = await supabase
           .from('profiles')
           .update({ trial_ends_at: newTrialDate })
           .eq('id', profileData.id);

         if (!updateError) {
             profileData.trial_ends_at = newTrialDate;
             await AsyncStorage.removeItem('PENDING_TRIAL_START');
         }
      }

      setProfile(profileData);

      // --- 2. Calculate Trial Logic ---
      if (profileData?.trial_ends_at) {
          const trialEnd = parseISO(profileData.trial_ends_at);
          const now = new Date();
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

      // 3. Fetch Workgroup
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
      setSubscriptionStatus('trial_active');
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session) {
      await fetchProfileAndWorkgroup(session);
    }
  }, [session, fetchProfileAndWorkgroup]);

  // --- 1. Initial Load & Auth Listener (Synchronous) ---
  useEffect(() => {
    let mounted = true;

    const getInitialData = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (mounted) {
         setSession(initialSession);
         setLoading(false);
      }
    };

    getInitialData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        
        if (!newSession) {
          // Cleanup on logout
          setProfile(null);
          setWorkgroup(null);
          setStockGridLocked(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // --- 2. Fetch Data when Session Changes (Async) ---
  useEffect(() => {
    if (session) {
      fetchProfileAndWorkgroup(session);
    }
  }, [session, fetchProfileAndWorkgroup]);

  // --- 3. REALTIME LISTENER: Handle Force Logout / Updates ---
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel(`profile_watcher_${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`, // Listen only to my own profile changes
        },
        async (payload) => {
          const newProfile = payload.new as Profile;
          
          // Check if user was removed (workgroup_id changed to null)
          if (newProfile.workgroup_id === null) {
            console.log('User removed from workgroup via Realtime. Logging out.');
            
            // Log out explicitly
            await signOut();
            
            // Note: The onAuthStateChange listener will handle the UI redirection
          } else {
            // If just a role change or name update, simply refresh data
            refreshProfile();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, refreshProfile]);

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
        daysRemaining,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};