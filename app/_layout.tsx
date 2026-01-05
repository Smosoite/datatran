import '../i18n';
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';
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
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal', gestureEnabled: false }} />
        
        {/* Onboarding */}
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
  
  // Combine data loading states
  const isDataLoading = authLoading || onboardingLoading;

  useEffect(() => {
    if (isDataLoading) return;

    const currentRoute = segments[0] || '';
    
    // Define Route Groups
    const inAuthGroup = ['login', 'sign-up', 'forgot-password'].includes(currentRoute);
    const inSetupGroup = ['workgroup-gate', 'create-workgroup', 'join-workgroup'].includes(currentRoute);
    const inOnboardingGroup = currentRoute === 'onboarding';

    // --- LOGIC FLOW ---

    // A. Not Logged In? -> Go to Login
    if (!session) {
      if (!inAuthGroup) {
        router.replace('/login');
      }
      return; 
    }

    // B. No Workgroup? -> Go to Setup
    if (!profile?.workgroup_id) {
      if (!inSetupGroup) {
        router.replace('/workgroup-gate');
      }
      return;
    }

    // C. Not Onboarded? -> Go to Onboarding
    if (!hasCompletedOnboarding) {
      if (!inOnboardingGroup) {
        router.replace('/onboarding/welcome');
      }
      return;
    }

    // D. Everything Good? -> Go to Tabs
    // Only redirect if stuck in a setup flow
    if (inAuthGroup || inSetupGroup || inOnboardingGroup) {
      router.replace('/(tabs)');
    }

  }, [session, profile?.workgroup_id, hasCompletedOnboarding, segments, isDataLoading]); 

  // --- RENDERING ---
  // We overlay a loading spinner, but we keep ThemedStack rendered underneath.
  // This prevents the "Navigation Not Ready" and "Flood" errors.
  
  return (
    <View style={{ flex: 1 }}>
      <ThemedStack />
      
      {isDataLoading && (
        <View 
          style={{ 
            position: 'absolute', 
            top: 0, left: 0, right: 0, bottom: 0, 
            justifyContent: 'center', 
            alignItems: 'center', 
            backgroundColor: colors.background,
            zIndex: 999 
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
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