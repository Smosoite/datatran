import '../i18n';
import { useTranslation } from 'react-i18next';
import React, { useEffect } from 'react';
import { useRouter, useSegments, Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider'; 
import { StatusBar } from 'expo-status-bar';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { FontAwesome } from '@expo/vector-icons';
import { ModalProvider } from '../providers/ModalProvider';
import { typography } from '../styles/typography';
import { CopilotProvider } from "react-native-copilot";

// --- FIXED CUSTOM TOOLTIP COMPONENT ---
const CustomTooltip = ({ 
  isFirstStep, 
  isLastStep, 
  handleNext, 
  handlePrev, 
  handleStop, 
  currentStep, 
  labels 
}: any) => {
  const { colors } = useTheme();

  // FIX: Explicitly check for the 'text' property. 
  // Providing an empty string fallback prevents the library's "Loading info..." default.
  const stepDescription = currentStep?.text || "";

  return (
    <View style={[styles.tooltipContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Step Header (Step Name) */}
      {currentStep?.name && (
        <Text style={[typography.h3, { color: colors.text, marginBottom: 8 }]}>
          {currentStep.name.replace(/([A-Z])/g, ' $1').trim()} 
        </Text>
      )}

      {/* Step Body (Instruction Text) */}
      <Text style={[typography.body, { color: colors.subtext, marginBottom: 20 }]}>
        {stepDescription}
      </Text>

      {/* Tooltip Footer (Navigation Buttons) */}
      <View style={styles.tooltipFooter}>
        <TouchableOpacity onPress={handleStop}>
          <Text style={[typography.caption, { color: colors.subtext, padding: 8 }]}>
            {labels?.skip || 'Skip'}
          </Text>
        </TouchableOpacity>

        <View style={styles.buttonGroup}>
          {!isFirstStep && (
            <TouchableOpacity onPress={handlePrev}>
              <Text style={[typography.button, { color: colors.primary, fontSize: 14, padding: 8 }]}>
                {labels?.previous || 'Back'}
              </Text>
            </TouchableOpacity>
          )}

          {!isLastStep ? (
            <TouchableOpacity onPress={handleNext}>
              <Text style={[typography.button, { color: colors.primary, fontWeight: 'bold', fontSize: 14, padding: 8 }]}>
                {labels?.next || 'Next'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleStop}>
              <Text style={[typography.button, { color: colors.success, fontWeight: 'bold', fontSize: 14, padding: 8 }]}>
                {labels?.finish || 'Done'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

// --- STACK NAVIGATOR ---
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
        <Stack.Screen name="warehouse/[id]" options={{ headerShown: true, title: t('warehouse.manageHeader') }} />
        <Stack.Screen name="create-warehouse" options={{ presentation: 'modal', title: t('warehouse.createHeader') }} />
        <Stack.Screen name="add-item" options={{ presentation: 'modal', title: t('item.addHeader') }} />
        <Stack.Screen name="find" options={{ title: t('item.findHeader') }} />
        <Stack.Screen name="edit-item/[id]" options={{ presentation: 'modal', title: t('item.editHeader') }} />
        <Stack.Screen name="scan" options={{ presentation: 'modal', title: t('scan.title') }} />
        <Stack.Screen name="restock" options={{ presentation: 'modal', title: t('restock.title') }} />
        <Stack.Screen name="history" options={{ title: t('settings.history') }} /> 
        <Stack.Screen name="manage-members" options={{ title: t('settings.membersTitle') }} />
      </Stack>
    </>
  );
};

// --- AUTH HANDLER ---
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
  }, [session, profile, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <ThemedStack />;
};

// --- APP WRAPPER WITH COPILOT ---
const AppWithCopilot = () => {
  const { colors } = useTheme();
  
  return (
    <CopilotProvider 
      stopOnOutsideClick 
      androidStatusBarVisible
      tooltipComponent={CustomTooltip} 
      stepNumberComponent={() => null}
      overlay="svg" 
      backdropColor="rgba(0, 0, 0, 0.7)"
      // Fixed: Setting tooltipStyle to transparent ensures your custom bubble handles its own styling
      tooltipStyle={{ backgroundColor: 'transparent', borderRadius: 12 }}
    >
      <ModalProvider>
        <MainNavigator />
        <Toast config={getToastConfig(colors)} /> 
      </ModalProvider>
    </CopilotProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
           <AppWithCopilot />
        </AuthProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

// --- UTILITY STYLES ---
const styles = StyleSheet.create({
  tooltipContainer: {
    padding: 16, 
    borderRadius: 12, 
    width: 280, 
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  tooltipFooter: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center'
  },
  buttonGroup: {
    flexDirection: 'row', 
    gap: 8
  }
});

const getToastConfig = (colors: any) => ({
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ height: 80, borderLeftColor: colors.success, backgroundColor: colors.card, borderLeftWidth: 7 }}
      text1Style={{ fontSize: 16, fontWeight: '600', color: colors.text }}
      text2Style={{ fontSize: 14, color: colors.subtext }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ height: 80, borderLeftColor: colors.danger, backgroundColor: colors.card, borderLeftWidth: 7 }}
      text1Style={{ fontSize: 16, fontWeight: '600', color: colors.text }}
      text2Style={{ fontSize: 14, color: colors.subtext }}
    />
  ),
});