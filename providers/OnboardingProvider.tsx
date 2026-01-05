import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthProvider'; // Import Auth to access the User ID

type OnboardingContextType = {
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextType>({
  hasCompletedOnboarding: false,
  isLoading: true,
  completeOnboarding: async () => {},
  resetOnboarding: async () => {},
});

export const useOnboarding = () => useContext(OnboardingContext);

export const OnboardingProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth(); // Access the current session
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get a unique ID for the user (or null if not logged in)
  // Adjust 'session?.user?.id' if your auth object structure is different
  const userId = session?.user?.id || null;

  useEffect(() => {
    if (userId) {
      // If we have a user, check THEIR specific status
      checkOnboardingStatus(userId);
    } else {
      // If no user (logout), reset state and stop loading
      setHasCompletedOnboarding(false);
      setIsLoading(false);
    }
  }, [userId]); // Re-run whenever the user changes (Login/Logout)

  const checkOnboardingStatus = async (uid: string) => {
    try {
      setIsLoading(true);
      // UNIQUE KEY PER USER: 'ONBOARDING_COMPLETED_user123'
      const key = `ONBOARDING_COMPLETED_${uid}`;
      const value = await AsyncStorage.getItem(key);
      setHasCompletedOnboarding(value === 'true');
    } catch (e) {
      console.error('Failed to load onboarding status');
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    if (!userId) return; // Guard clause

    try {
      const key = `ONBOARDING_COMPLETED_${userId}`;
      await AsyncStorage.setItem(key, 'true');
      setHasCompletedOnboarding(true); 
    } catch (e) {
      console.error('Failed to save onboarding status');
    }
  };
  
  const resetOnboarding = async () => {
    if (!userId) return;

    try {
      const key = `ONBOARDING_COMPLETED_${userId}`;
      await AsyncStorage.removeItem(key);
      setHasCompletedOnboarding(false);
    } catch (e) {
      console.error('Failed to reset onboarding');
    }
  };

  return (
    <OnboardingContext.Provider value={{ hasCompletedOnboarding, isLoading, completeOnboarding, resetOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
};