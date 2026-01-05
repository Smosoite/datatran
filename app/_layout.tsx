import '../i18n'; 
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage

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
        <Stack.Screen name="create-warehouse" options={{ headerShown: true, title: t('warehouse.createHeader'), presentation: 'modal' }} />
        <Stack.Screen name="add-item" options={{ headerShown: true, title: t('item.addHeader'), presentation: 'modal' }} />
        <Stack.Screen name="create-storage" options={{ headerShown: true, title: '', presentation: 'modal' }} />
        <Stack.Screen name="storage/[id]" options={{ headerShown: true, presentation: 'push' }} />
        <Stack.Screen name="create-location" options={{ headerShown: true, title: '', presentation: 'modal' }} />
        <Stack.Screen name="select-location-modal" options={{ headerShown: true, title: t('location.selectLocal'), presentation: 'modal' }} />
        <Stack.Screen name="find" options={{ headerShown: true, title: t('item.findHeader'), presentation: 'push' }} />
        <Stack.Screen name="edit-item/[id]" options={{ headerShown: true, title: t('item.editHeader'), presentation: 'modal' }} />
        <Stack.Screen name="scan" options={{ headerShown: true, title: t('scan.title'), presentation: 'modal' }} />
        <Stack.Screen name="restock" options={{ headerShown: true, title: t('restock.title'), presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ headerShown: true, title: t('profile.title'), presentation: 'modal' }} />
        <Stack.Screen name="edit-location/[id]" options={{ headerShown: true, title: t('location.editHeader'), presentation: 'modal' }} />
        <Stack.Screen name="stock-grid" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="history" options={{ headerShown: true, presentation: 'push' }} /> 
        <Stack.Screen name="manage-members" options={{ headerShown: true, presentation: 'push' }} />
        
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
  const router = useRouter();
  const { colors } = useTheme();
  const segments = useSegments();
  
  // State to track if we've checked AsyncStorage for onboarding status
  const [isOnboardingChecked, setIsOnboardingChecked] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Check Onboarding Status on Mount
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('ONBOARDING_COMPLETED');
        setHasCompletedOnboarding(value === 'true');
      } catch (e) {
        console.error("Failed to check onboarding status", e);
      } finally {
        setIsOnboardingChecked(true);
      }
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    // Wait for both Auth and Onboarding checks to complete
    if (authLoading || !isOnboardingChecked) return;

    const currentRoute = segments[0] || null;
    
    // Define Flow Groups
    // NOTE: removed 'paywall' from inAuthFlow so logged-in users aren't kicked out of it
    const inAuthFlow = ['login', 'sign-up'].includes(currentRoute); 
    const inSetupFlow = ['workgroup-gate', 'create-workgroup', 'join-workgroup'].includes(currentRoute);
    const inOnboardingFlow = currentRoute === 'onboarding';

    // 1. Check Authentication
    if (!session) {
      // Allow paywall for non-logged users if needed, otherwise keep strict
      if (!inAuthFlow && currentRoute !== 'paywall') router.replace('/login');
      return;
    }

    // 2. Check Workgroup Setup
    if (!profile?.workgroup_id) {
      if (!inSetupFlow) router.replace('/workgroup-gate');
      return;
    }

    // 3. Check Onboarding (Only if logged in & has workgroup)
    if (!hasCompletedOnboarding) {
      if (!inOnboardingFlow) router.replace('/onboarding/welcome');
      return;
    }

    // 4. Default Redirects for Logged In Users
    // If user tries to go back to login, setup, or onboarding after finishing -> Send to Tabs
    if (inAuthFlow || inSetupFlow || inOnboardingFlow) {
      router.replace('/(tabs)');
    }

  }, [session, profile, authLoading, isOnboardingChecked, hasCompletedOnboarding, segments, router]);

  // Show spinner while checking Auth OR Onboarding status
  if (authLoading || !isOnboardingChecked) {
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

  // Helper for Toasts
  const AppWithToasts = () => {
    const { colors } = useTheme();
    
    // ... (Keep your existing Toast Configuration exactly as is) ...
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
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <CopilotProvider stopOnOutsideClick androidStatusBarVisible>
            <ModalProvider>
              <AppWithToasts />
            </ModalProvider>
          </CopilotProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}