import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type OnboardingContextType = {
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>; // Useful for testing!
};

const OnboardingContext = createContext<OnboardingContextType>({
  hasCompletedOnboarding: false,
  isLoading: true,
  completeOnboarding: async () => {},
  resetOnboarding: async () => {},
});

export const useOnboarding = () => useContext(OnboardingContext);

export const OnboardingProvider = ({ children }: { children: React.ReactNode }) => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const value = await AsyncStorage.getItem('ONBOARDING_COMPLETED');
      setHasCompletedOnboarding(value === 'true');
    } catch (e) {
      console.error('Failed to load onboarding status');
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('ONBOARDING_COMPLETED', 'true');
      setHasCompletedOnboarding(true); // Updates state immediately!
    } catch (e) {
      console.error('Failed to save onboarding status');
    }
  };
  
  const resetOnboarding = async () => {
      try {
        await AsyncStorage.removeItem('ONBOARDING_COMPLETED');
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