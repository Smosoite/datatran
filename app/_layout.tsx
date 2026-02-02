import '../i18n';
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { useRouter, useSegments, Stack, usePathname } from 'expo-router';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider';
import { StatusBar } from 'expo-status-bar';
import Toast, { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import { ModalProvider } from '../providers/ModalProvider';
import { CopilotProvider } from "react-native-copilot";
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { OnboardingProvider, useOnboarding } from '../providers/OnboardingProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- 1. ThemedStack (Visual Layer) ---
const ThemedStack = () => {
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
        
        {/* Auth Screens */}
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />

        {/* Setup Screens */}
        <Stack.Screen name="workgroup-gate" options={{ headerShown: false }} />
        <Stack.Screen name="create-workgroup" options={{ headerShown: true, title: 'Create Workgroup' }} />
        <Stack.Screen name="join-workgroup" options={{ headerShown: true, title: 'Join Workgroup' }} />

        {/* App Screens */}
        <Stack.Screen name="warehouse/[id]" options={{ headerShown: true, title: '', presentation: 'push' }} />
        <Stack.Screen name="create-warehouse" options={{ headerShown: true, title: 'Create Warehouse', presentation: 'modal' }} />
        <Stack.Screen name="add-item" options={{ headerShown: true, title: '', presentation: 'modal' }} />
        <Stack.Screen name="create-storage" options={{ headerShown: true, title: '', presentation: 'modal' }} />
        <Stack.Screen name="storage/[id]" options={{ headerShown: true, presentation: 'push' }} />
        <Stack.Screen name="create-location" options={{ headerShown: true, title: '', presentation: 'modal' }} />
        <Stack.Screen name="select-location-modal" options={{ headerShown: true, title: '', presentation: 'modal' }} />
        <Stack.Screen name="find" options={{ headerShown: true, title: '', presentation: 'push' }} />
        <Stack.Screen name="edit-item/[id]" options={{ headerShown: true, title: '', presentation: 'modal' }} />
        <Stack.Screen name="scan" options={{ headerShown: true, title: '', presentation: 'modal' }} />
        <Stack.Screen name="restock" options={{ headerShown: true, title: '', presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ headerShown: true, title: '', presentation: 'modal' }} />
        <Stack.Screen name="edit-location/[id]" options={{ headerShown: true, title: '', presentation: 'modal' }} />
        <Stack.Screen name="stock-grid" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="history" options={{ headerShown: true, presentation: 'push' }} /> 
        <Stack.Screen name="manage-members" options={{ headerShown: true, presentation: 'push' }} />
        
        {/* Paywall & Onboarding */}
        <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'modal', gestureEnabled: false }} />
      </Stack>
    </>
  );
};

// --- 2. AuthRedirectHandler (Logic Layer) ---
const AuthRedirectHandler = ({ children }: { children: React.ReactNode }) => {
  const { session, profile, loading: authLoading, subscriptionStatus } = useAuth();
  const { hasCompletedOnboarding, isLoading: onboardingLoading } = useOnboarding();
  const { colors } = useTheme();

  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  const [isMounted, setIsMounted] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const checkDemo = async () => {
        const demo = await AsyncStorage.getItem('DEMO_SUBSCRIPTION_ACTIVE');
        setIsDemoMode(demo === 'true');
        setIsMounted(true);
    };
    checkDemo();
  }, [hasCompletedOnboarding]);

  const isLoading = onboardingLoading || authLoading || !isMounted;

  useEffect(() => {
    const runAuthGuard = async () => {
        if (isLoading) return;

        const currentRoute = segments[0] || '';

        // Group definitions
        const inAuthGroup = ['login', 'sign-up', 'forgot-password'].includes(currentRoute);
        const inSetupGroup = ['workgroup-gate', 'create-workgroup', 'join-workgroup'].includes(currentRoute);
        const inOnboardingGroup = currentRoute === 'onboarding';

        // --- LOGIC FLOW (Strict Order) ---

        // 1. Not Onboarded? -> Onboarding Flow
        if (!hasCompletedOnboarding) {
        if (!inOnboardingGroup) {
            router.replace('/onboarding/welcome');
        }
        return;
        }

        // 2. Not Logged In? -> Login
        if (!session) {
            // Clean up any logout flags now that we are truly logged out
            await AsyncStorage.removeItem('IS_LOGGING_OUT');
            
            if (!inAuthGroup) router.replace('/login');
            return;
        }

        // 3. Subscription Check
        if (!isDemoMode && (subscriptionStatus === 'trial_expired')) {
        if (currentRoute !== 'paywall' && !pathname.includes('paywall')) {
            router.replace('/onboarding/paywall?expired=true');
        }
        return;
        }

        // 4. No Workgroup? -> Setup
        if (!profile?.workgroup_id) {
        if (!inSetupGroup) router.replace('/workgroup-gate');
        return;
        }

        // 5. All Good -> Main App OR Custom Destination
        if (inAuthGroup || inSetupGroup || inOnboardingGroup || pathname.includes('paywall')) {
        
            // --- FIX FOR REDIRECT LOOP ---
            // If we are on the login screen AND we set the 'IS_LOGGING_OUT' flag,
            // we stop here. We do NOT redirect to tabs. We let the user stay on Login.
            if (inAuthGroup) {
                const isLoggingOut = await AsyncStorage.getItem('IS_LOGGING_OUT');
                if (isLoggingOut === 'true') {
                    return; 
                }
            }
            // -----------------------------

            // --- NEW LOGIC START ---
            const customDestination = await AsyncStorage.getItem('LOGIN_DESTINATION');
            
            if (customDestination) {
                await AsyncStorage.removeItem('LOGIN_DESTINATION');
                router.replace(customDestination as any); 
            } else {
                router.replace('/(tabs)');
            }
            // --- NEW LOGIC END ---
        }
    };

    runAuthGuard();

  }, [session, profile, hasCompletedOnboarding, subscriptionStatus, segments, isLoading, isDemoMode, pathname]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {isLoading && (
        <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: colors.background,
            justifyContent: 'center', alignItems: 'center', zIndex: 999
        }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

// --- 3. Providers Wrapper ---
const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={i18n}>
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <OnboardingProvider>
            <CopilotProvider stopOnOutsideClick androidStatusBarVisible>
              <ModalProvider>
                {children}
              </ModalProvider>
            </CopilotProvider>
          </OnboardingProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  </I18nextProvider>
);

// --- 4. Toast Config ---
const toastConfig = (colors: any) => ({
  success: (props: any) => (
    <BaseToast {...props} 
      style={{ borderLeftColor: colors.success, backgroundColor: colors.card }} 
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: '600', color: colors.text }}
      text2Style={{ fontSize: 14, color: colors.subtext }}
    />
  ),
  error: (props: any) => (
    <ErrorToast {...props} 
      style={{ borderLeftColor: colors.danger, backgroundColor: colors.card }} 
      text1Style={{ color: colors.text }}
      text2Style={{ color: colors.subtext }}
    />
  ),
  info: (props: any) => (
    <InfoToast {...props} 
      style={{ borderLeftColor: colors.info, backgroundColor: colors.card }} 
      text1Style={{ color: colors.text }}
      text2Style={{ color: colors.subtext }}
    />
  )
});

// --- 5. Content Component ---
const AppContent = () => {
  const { colors } = useTheme();
   
  return (
    <>
      <AuthRedirectHandler>
        <ThemedStack />
      </AuthRedirectHandler>
      <Toast config={toastConfig(colors)} />
    </>
  );
};

// --- 6. Root Layout ---
export default function RootLayout() {
  useFrameworkReady();

  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}