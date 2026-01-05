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
        gestureEnabled: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="features" />
      <Stack.Screen name="demo-warehouse" />
      
      {/* NEW SCREENS */}
      <Stack.Screen name="setup-grid" />
      <Stack.Screen name="add-first-item" />

      {/* Optional: Keep these if you want, or remove if replaced by the real steps above */}
      {/* <Stack.Screen name="demo-inventory" />
      <Stack.Screen name="demo-scanning" />*/}
      
      <Stack.Screen name="completion" />
    </Stack>
  );
}