import '../i18n'; // Keep this side-effect import
import i18n from '../i18n'; // Import the instance for the Provider
import { I18nextProvider } from 'react-i18next'; // 👇 IMPORT THIS
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
import { OnboardingProvider, useOnboarding } from '../providers/OnboardingProvider';

// --- ThemedStack (Visual Layer) ---
const ThemedStack = () => {
  const { t } = useTheme(); // Just using useTheme here to ensure context exists
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
        <Stack.Screen name="profile" options={{ headerShown: true, title: 'Profile', presentation: 'modal' }} />
        <Stack.Screen name="edit-location/[id]" options={{ headerShown: true, title: 'Edit Location', presentation: 'modal' }} />
        <Stack.Screen name="stock-grid" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="history" options={{ headerShown: true, presentation: 'push' }} /> 
        <Stack.Screen name="manage-members" options={{ headerShown: true, presentation: 'push' }} />
        
        <Stack.Screen 
          name="paywall" 
          options={{ 
            headerShown: false, 
            presentation: 'modal',
            gestureEnabled: false 
          }} 
        />
        
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
      if (!inAuthFlow) router.replace('/login');
      return; 
    }

    // 2. Check Workgroup Setup
    if (!profile?.workgroup_id) {
      if (!inSetupFlow) router.replace('/workgroup-gate');
      return;
    }

    // 3. Check Onboarding (Only if Logged In + Has Workgroup)
    if (!hasCompletedOnboarding) {
      if (!inOnboardingFlow) router.replace('/onboarding/welcome');
      return;
    }

    // 4. Default Redirects
    if (inAuthFlow || inSetupFlow || inOnboardingFlow) {
      router.replace('/(tabs)');
    }

  }, [session, profile, isLoading, hasCompletedOnboarding, segments, router]);

  // Loading State
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // 👇 CRITICAL FIX: If we are not onboarded, DO NOT render ThemedStack (which contains HomeScreen)
  // We render null so the router can handle the redirect in the useEffect above without crashing UI
  if (!session || (!profile?.workgroup_id) || (!hasCompletedOnboarding)) {
      return null; 
  }

  // Only render the app if we passed all checks
  return <ThemedStack />;
};

// --- Root Layout ---
export default function RootLayout() {
  useFrameworkReady();

  // Helper for Toasts
  const AppWithToasts = () => {
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

  return (
    // 👇 CRITICAL FIX: Explicitly wrap in I18nextProvider
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
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
    </I18nextProvider>
  );
}