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
import { typography } from '../styles/typography';
import { CopilotProvider } from "react-native-copilot";

// --- FIX: This component is now correctly using the restored ThemeProvider ---
const ThemedStack = () => {
  const { t } = useTranslation();
  // Get `mode` for the status bar and `colors` for styling
  const { mode, colors } = useTheme();

  return (
    <>
      {/* Use `mode` to determine the status bar style */}
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
        {/* Reminder: The title for this screen should be set dynamically inside `app/storage/[id].tsx` */}
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
        <Stack.Screen 
  name="paywall" 
  options={{ 
    headerShown: false, 
    presentation: 'modal',
    gestureEnabled: false // Prevent swiping away if mandatory
  }} 
/>
      </Stack>
    </>
  );
};

// This component's logic is already correct and robust.
const MainNavigator = () => {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
    const { colors } = useTheme();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const currentRoute = segments[0] || null;
    const inAuthFlow = ['login', 'sign-up', 'paywall'].includes(currentRoute);
    const inSetupFlow = ['workgroup-gate', 'create-workgroup', 'join-workgroup'].includes(currentRoute);

    if (!session) {
      if (!inAuthFlow) router.replace('/login');
      return;
    }
    if (!profile?.workgroup_id) {
      if (!inSetupFlow) router.replace('/workgroup-gate');
      return;
    }
    if (inAuthFlow || inSetupFlow) {
      router.replace('/(tabs)');
    }
  }, [session, profile, loading, segments, router]);

  if (loading) {
    // 2. Apply the primary theme color to the spinner
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <ThemedStack />;
};


// This component is also correct.
export default function RootLayout() {
  // We need access to the theme to style our toasts, so we'll create a small helper component
  const AppWithToasts = () => {
    const { colors } = useTheme();

const toastConfig = {
      // Success Toast
      success: (props) => (
        <BaseToast
          {...props}
          // --- FIX: Add alignItems: 'center' to center content vertically ---
          style={{ 
            height: 80, 
            borderLeftColor: colors.success, 
            backgroundColor: colors.card, 
            borderLeftWidth: 7,
            alignItems: 'center', // This is the key change for vertical alignment
          }}
          text2NumberOfLines={2}
          contentContainerStyle={{ paddingHorizontal: 15 }}
          text1Style={{ fontSize: 16, fontWeight: '600', color: colors.text }}
          text2Style={{ fontSize: 14, color: colors.subtext }}
          renderLeadingIcon={() => (
            <FontAwesome 
              name="check-circle" 
              size={24} 
              color={colors.success} 
              style={{ marginLeft: 15 }} 
            />
          )}
        />
      ),
      // Error Toast
      error: (props) => (
        <ErrorToast
          {...props}
          // --- FIX: Add alignItems: 'center' to center content vertically ---
          style={{ 
            height: 80, 
            borderLeftColor: colors.danger, 
            backgroundColor: colors.card, 
            borderLeftWidth: 7,
            alignItems: 'center', // This is the key change for vertical alignment
          }}
          text2NumberOfLines={2}
          contentContainerStyle={{ paddingHorizontal: 15 }}
          text1Style={{ fontSize: 16, fontWeight: '600', color: colors.text }}
          text2Style={{ fontSize: 14, color: colors.subtext }}
          renderLeadingIcon={() => (
            <FontAwesome 
              name="warning" 
              size={24} 
              color={colors.danger} 
              style={{ marginLeft: 15 }} 
            />
          )}
        />
      ),

       info: (props) => (
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
          {/* 2. Move ModalProvider to wrap the component that renders your screens */}
          <ModalProvider>
            <AppWithToasts />
          </ModalProvider>
          </CopilotProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}