import '../i18n';
import { useTranslation } from 'react-i18next';
import React, { useEffect } from 'react';
import { useRouter, useSegments, Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider'; 
import { StatusBar } from 'expo-status-bar';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { FontAwesome } from '@expo/vector-icons';
import { ModalProvider } from '../providers/ModalProvider';
import { typography } from '../styles/typography';
import { CopilotProvider } from "react-native-copilot";

// --- CUSTOM TOOLTIP COMPONENT ---
// Defined safely outside of other components
const CustomTooltip = ({ isFirstStep, isLastStep, handleNext, handlePrev, handleStop, currentStep, labels }: any) => {
  const { colors } = useTheme();

  // Debugging: If this logs "undefined", the step isn't loading correctly
  // console.log("Tooltip Step Data:", currentStep);

  return (
    <View style={{ 
      backgroundColor: colors.card, 
      padding: 16, 
      borderRadius: 12, 
      maxWidth: 300, 
      borderWidth: 1, 
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    }}>
      {/* Title */}
      {currentStep?.name ? (
         <Text style={[typography.h3, { color: colors.text, marginBottom: 8 }]}>
           {currentStep.name}
         </Text>
      ) : null}

      {/* Body Text - Check 'text' property specifically */}
      <Text style={[typography.body, { color: colors.subtext, marginBottom: 20 }]}>
        {currentStep?.text || "Loading info..."} 
      </Text>

      {/* Buttons */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity onPress={handleStop}>
            <Text style={[typography.caption, { color: colors.subtext, padding: 8 }]}>
              {labels?.skip || 'Skip'}
            </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 16 }}>
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

// --- APP WRAPPER WITH COPILOT ---
const AppWithCopilot = () => {
    const { colors } = useTheme();
    
    return (
        <CopilotProvider 
            stopOnOutsideClick 
            androidStatusBarVisible
            tooltipComponent={CustomTooltip} 
            stepNumberComponent={() => null} // Hides the little green number badge
            arrowColor={colors.card} // Matches tooltip background so the little arrow blends in
            overlay="svg" 
            backdropColor="rgba(0, 0, 0, 0.7)"
            // --- FIX: This removes the default white box ---
            tooltipStyle={{ backgroundColor: 'transparent', borderRadius: 12 }}
        >
            <ModalProvider>
                <MainNavigator />
                <Toast config={getToastConfig(colors)} /> 
            </ModalProvider>
        </CopilotProvider>
    );
}

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
           <AppWithCopilot />
        </AuthProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}