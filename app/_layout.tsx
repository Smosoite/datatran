import '../i18n';
import { useTranslation } from 'react-i18next';
import React, { useEffect } from 'react';
import { useRouter, useSegments, Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { View, ActivityIndicator, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider'; 
import { StatusBar } from 'expo-status-bar';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { FontAwesome } from '@expo/vector-icons';
import { ModalProvider } from '../providers/ModalProvider';
import { typography } from '../styles/typography';
import { CopilotProvider } from "react-native-copilot";

// --- CUSTOM TOOLTIP COMPONENT ---
// This ensures the "Tour" popup matches your App's Theme

interface CopilotTooltipProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  handleNext: () => void;
  handlePrev: () => void;
  handleStop: () => void;
  currentStep: {
    name: string;
    text: string;
    order: number;
    target: any;
    wrapper: any;
  };
  labels: {
    skip: string;
    previous: string;
    next: string;
    finish: string;
  };
}
const CustomTooltip = ({ isFirstStep, isLastStep, handleNext, handlePrev, handleStop, currentStep, labels }: CopilotTooltipProps) => {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12, width: 250, borderWidth: 1, borderColor: colors.border }}>
      <Text style={[typography.h3, { color: colors.text, marginBottom: 8 }]}>{currentStep.name}</Text>
      <Text style={[typography.body, { color: colors.subtext, marginBottom: 16 }]}>{currentStep.text}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {!isFirstStep ? (
          <Text onPress={handlePrev} style={{ color: colors.primary, fontWeight: 'bold' }}>{labels.previous}</Text>
        ) : <View />}
        {!isLastStep ? (
          <Text onPress={handleNext} style={{ color: colors.primary, fontWeight: 'bold' }}>{labels.next}</Text>
        ) : (
          <Text onPress={handleStop} style={{ color: colors.success, fontWeight: 'bold' }}>{labels.finish}</Text>
        )}
      </View>
    </View>
  );
};

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
        <Stack.Screen 
          name="paywall" 
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
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <ThemedStack />;
};

// --- FIX: Wrapper to consume Theme for Copilot ---
const AppWithCopilot = () => {
    const { colors } = useTheme();
    
    return (
        <CopilotProvider 
            stopOnOutsideClick 
            androidStatusBarVisible
            tooltipComponent={CustomTooltip} // Use our custom themed tooltip
            stepNumberComponent={() => null} // Hide step numbers if you want cleaner look
            arrowColor={colors.card}
            overlay="svg" // Smoother overlay
            backdropColor="rgba(0, 0, 0, 0.7)"
        >
            <ModalProvider>
                <MainNavigator />
                {/* Toasts must be inside ThemeProvider to use colors */}
                <Toast config={getToastConfig(colors)} /> 
            </ModalProvider>
        </CopilotProvider>
    );
}

// Helper for Toast Config to keep render clean
const getToastConfig = (colors: any) => ({
    success: (props: any) => (
      <BaseToast
        {...props}
        style={{ 
          height: 80, 
          borderLeftColor: colors.success, 
          backgroundColor: colors.card, 
          borderLeftWidth: 7,
          alignItems: 'center', 
        }}
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
        style={{ 
          height: 80, 
          borderLeftColor: colors.danger, 
          backgroundColor: colors.card, 
          borderLeftWidth: 7,
          alignItems: 'center', 
        }}
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
});

export default function RootLayout() {
  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
           {/* All content moved into AppWithCopilot to access ThemeProvider context */}
           <AppWithCopilot />
        </AuthProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}