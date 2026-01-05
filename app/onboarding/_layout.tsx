import '../i18n'; 
import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '../../providers/ThemeProvider';

export default function OnboardingLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        gestureEnabled: false, // Prevent swiping away during onboarding
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="features" />
      <Stack.Screen name="demo-warehouse" />
      <Stack.Screen name="demo-inventory" />
      <Stack.Screen name="demo-scanning" />
      <Stack.Screen name="completion" />
    </Stack>
  );
}