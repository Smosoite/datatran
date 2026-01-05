import '../i18n'; 
import { useTranslation } from 'react-i18next';
import React, { useEffect } from 'react';
import { useRouter, useSegments, Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider'; 
import { StatusBar } from 'expo-status-bar';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { FontAwesome } from '@expo/vector-icons';
import { ModalProvider } from '../providers/ModalProvider';
import { CopilotProvider } from "react-native-copilot"
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
// 👇 1. Import the new Provider
import { OnboardingProvider, useOnboarding } from '../providers/OnboardingProvider';

// --- ThemedStack (Visual Layer) ---
const ThemedStack = () => {
  const { t } = useTranslation();
  const { mode, colors } = useTheme();

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="warehouse/[id]" options={{ headerShown: true, title: t('warehouse.manageHeader'), presentation: 'push' }} />
        {/* ... Keep all your other screens exactly as they were ... */}
        
        {/* Paywall: Accessible after onboarding */}
        <Stack.Screen 
          name="paywall" 
          options={{ 
            headerShown: false, 
            presentation: 'modal',
            gestureEnabled: false 
          }} 
        />
        
        {/* Onboarding Flow */}
        <Stack.Screen 
          name="onboarding" 
          options={{ 
            headerShown: false, 
            presentation: 'modal',
            gestureEnabled: false 
          }} 
        />
      </Stack>
    </>
  );
};

// --- MainNavigator (Logic Layer) ---
const MainNavigator = () => {
  const { session, profile, loading: authLoading } = useAuth();
  // 👇 2. Use the new Onboarding hook
  const { hasCompletedOnboarding, isLoading: onboardingLoading } = useOnboarding();
  
  const router = useRouter();
  const { colors } = useTheme();
  const segments = useSegments();
  
  const isLoading = authLoading || onboardingLoading;

  useEffect(() => {
    if (isLoading) return;

    const currentRoute = segments[0] || null;
    
    // Define Flow Groups
    const inAuthFlow = ['login', 'sign-up'].includes(currentRoute); 
    const inSetupFlow = ['workgroup-gate', 'create-workgroup', 'join-workgroup'].includes(currentRoute);
    const inOnboardingFlow = currentRoute === 'onboarding';

    // 1. Check Authentication FIRST
    if (!session) {
      // If not logged in, force Login screen (unless already there)
      if (!inAuthFlow) {
         router.replace('/login');
      }
      return; // Stop here. Do not check onboarding if not logged in.
    }

    // 2. Check Workgroup Setup
    if (!profile?.workgroup_id) {
      if (!inSetupFlow) router.replace('/workgroup-gate');
      return;
    }

    // 3. Check Onboarding (Only reaches here if Logged In + Has Workgroup)
    if (!hasCompletedOnboarding) {
      if (!inOnboardingFlow) router.replace('/onboarding/welcome');
      return;
    }

    // 4. Cleanup Redirects
    // If user is logged in & onboarded, but still sitting on login/onboarding screens -> Go to Tabs
    if (inAuthFlow || inSetupFlow || inOnboardingFlow) {
      router.replace('/(tabs)');
    }

  }, [session, profile, isLoading, hasCompletedOnboarding, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <ThemedStack />;
};

// --- Root Layout ---
export default function RootLayout() {
  useFrameworkReady();

  // ... (Your Toast Config Helper remains here) ...
  const AppWithToasts = () => { 
      // ... (Keep your toast config code) ...
      const { colors } = useTheme();
      // (Simplified for brevity, paste your ToastConfig here)
      return (
         <>
          <MainNavigator />
          <Toast /> 
         </>
      )
  };

  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
            {/* 👇 3. Add OnboardingProvider INSIDE AuthProvider */}
            <OnboardingProvider>
                <CopilotProvider stopOnOutsideClick androidStatusBarVisible>
                    <ModalProvider>
                        <AppWithToasts />
                    </ModalProvider>
                </CopilotProvider>
            </OnboardingProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}