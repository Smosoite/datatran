import '../i18n';
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';
import React, { useEffect } from 'react';
import { useRouter, useSegments, Stack, useRootNavigationState } from 'expo-router';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider';
import { StatusBar } from 'expo-status-bar';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { FontAwesome } from '@expo/vector-icons';
import { ModalProvider } from '../providers/ModalProvider';
import { CopilotProvider } from "react-native-copilot";
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { OnboardingProvider, useOnboarding } from '../providers/OnboardingProvider';

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
        {/* Main Tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Auth Screens - Ensure these exist in your file structure! */}
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />

        {/* Setup Screens */}
        <Stack.Screen name="workgroup-gate" options={{ headerShown: false }} />
        <Stack.Screen name="create-workgroup" options={{ headerShown: true, title: 'Create Workgroup' }} />
        <Stack.Screen name="join-workgroup" options={{ headerShown: true, title: 'Join Workgroup' }} />

        {/* Warehouse & Items */}
        <Stack.Screen name="warehouse/[id]" options={{ headerShown: true, title: 'Warehouse', presentation: 'push' }} />
        <Stack.Screen name="create-warehouse" options={{ headerShown: true, title: 'Create Warehouse', presentation: 'modal' }} />
        <Stack.Screen name="add-item" options={{ headerShown: true, title: 'Add Item', presentation: 'modal' }} />
        <Stack.Screen name="create-storage" options={{ headerShown: true, title: '', presentation: 'modal' }} />
        <Stack.Screen name="storage/[id]" options={{ headerShown: true, presentation: 'push' }} />
        <Stack.Screen name="create-location" options={{ headerShown: true, title: '', presentation: 'modal' }} />
        <Stack.Screen name="select-location-modal" options={{ headerShown: true, title: 'Select Location', presentation: 'modal' }} />
        <Stack.Screen name="find" options={{ headerShown: true, title: 'Find Item', presentation: 'push' }} />
        <Stack.Screen name="edit-item/[id]" options={{ headerShown: true, title: 'Edit Item', presentation: 'modal' }} />
        <Stack.Screen name="scan" options={{ headerShown: true, title: 'Scan', presentation: 'modal' }} />
        <Stack.Screen name="restock" options={{ headerShown: true, title: 'Restock', presentation: 'modal' }} />
        
        {/* Settings & Misc */}
        <Stack.Screen name="profile" options={{ headerShown: true, title: 'Profile', presentation: 'modal' }} />
        <Stack.Screen name="edit-location/[id]" options={{ headerShown: true, title: 'Edit Location', presentation: 'modal' }} />
        <Stack.Screen name="stock-grid" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="history" options={{ headerShown: true, presentation: 'push' }} /> 
        <Stack.Screen name="manage-members" options={{ headerShown: true, presentation: 'push' }} />
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal', gestureEnabled: false }} />
        
        {/* Onboarding - Ensure structure matches app/onboarding/welcome.tsx etc */}
        <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'modal', gestureEnabled: false }} />
      </Stack>
    </>
  );
};

// --- 2. MainNavigator (Logic Layer) ---
const MainNavigator = () => {
  const { session, profile, loading: authLoading } = useAuth();
  const { hasCompletedOnboarding, isLoading: onboardingLoading } = useOnboarding();
  const { colors } = useTheme();
  
  const segments = useSegments();
  const router = useRouter();
  
  // FIX: Use Expo Router's native hook to check if navigation is ready.
  // This prevents the "Navigation container not ready" errors.
  const rootNavigationState = useRootNavigationState();
  const isNavigationReady = rootNavigationState?.key;

  // Combine loading states
  const isLoading = authLoading || onboardingLoading || !isNavigationReady;

  useEffect(() => {
    // 1. If we are still initializing data, do nothing yet.
    if (isLoading) return;

    // 2. Determine current location type
    const currentRoute = segments[0] || '';
    
    // Add your auth route names here
    const inAuthGroup = ['login', 'sign-up', 'forgot-password'].includes(currentRoute);
    // Add your setup route names here
    const inSetupGroup = ['workgroup-gate', 'create-workgroup', 'join-workgroup'].includes(currentRoute);
    // Add your onboarding route name here
    const inOnboardingGroup = currentRoute === 'onboarding';

    // --- LOGIC FLOW ---

    // A. Not Logged In? -> Go to Login
    if (!session) {
      if (!inAuthGroup) {
        router.replace('/login');
      }
      return; 
    }

    // B. Logged in, but No Workgroup? -> Go to Workgroup Gate
    if (!profile?.workgroup_id) {
      if (!inSetupGroup) {
        router.replace('/workgroup-gate');
      }
      return;
    }

    // C. Workgroup set, but Not Onboarded? -> Go to Onboarding
    if (!hasCompletedOnboarding) {
      if (!inOnboardingGroup) {
        // Assuming your folder is app/onboarding/welcome.tsx, change if different
        router.replace('/onboarding/welcome');
      }
      return;
    }

    // D. All Requirements Met? -> Go to App (Tabs)
    // Only redirect if the user is currently stuck on a Setup/Auth/Onboarding screen
    if (inAuthGroup || inSetupGroup || inOnboardingGroup) {
      router.replace('/(tabs)');
    }

  }, [session, profile?.workgroup_id, hasCompletedOnboarding, segments, isLoading]); 

  // --- RENDERING ---
  
  // FIX: Only show loading spinner on INITIAL load.
  // Once the app is running, we allow ThemedStack to render to prevent unmounting issues.
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <ThemedStack />;
};

// --- 3. AppContent ---
const AppContent = () => {
  const { colors } = useTheme();
  
  const toastConfig = {
    success: (props: any) => (
      <BaseToast
        {...props}
        style={{ height: 80, borderLeftColor: colors.success, backgroundColor: colors.card, borderLeftWidth: 7, alignItems: 'center' }}
        text2NumberOfLines={2}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ fontSize: 16, fontWeight: '600', color: colors.text }}
        text2Style={{ fontSize: 14, color: colors.subtext }}
        renderLeadingIcon={() => <FontAwesome name="check-circle" size={24} color={colors.success} style={{ marginLeft: 15 }} />}
      />
    ),
    error: (props: any) => (
      <ErrorToast
        {...props}
        style={{ height: 80, borderLeftColor: colors.danger, backgroundColor: colors.card, borderLeftWidth: 7, alignItems: 'center' }}
        text2NumberOfLines={2}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ fontSize: 16, fontWeight: '600', color: colors.text }}
        text2Style={{ fontSize: 14, color: colors.subtext }}
        renderLeadingIcon={() => <FontAwesome name="warning" size={24} color={colors.danger} style={{ marginLeft: 15 }} />}
      />
    ),
    info: (props: any) => (
      <BaseToast
        {...props}
        style={{ borderLeftColor: colors.info, backgroundColor: colors.card, borderLeftWidth: 7, alignItems: 'center' }}
        text1Style={{ fontSize: 16, fontWeight: '600', color: colors.text }}
        text2Style={{ fontSize: 14, color: colors.subtext }}
        renderLeadingIcon={() => <FontAwesome name="info-circle" size={24} color={colors.info} style={{ marginLeft: 15 }} />}
      />
    ),
  };

  return (
    <>
      <MainNavigator />
      <Toast config={toastConfig} />
    </>
  );
};

// --- 4. Root Layout ---
export default function RootLayout() {
  useFrameworkReady();

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <OnboardingProvider>
              <CopilotProvider stopOnOutsideClick androidStatusBarVisible>
                <ModalProvider>
                  <AppContent />
                </ModalProvider>
              </CopilotProvider>
            </OnboardingProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </ThemeProvider>
    </I18nextProvider>
  );
}