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
      <Stack.Screen name="demo" />
      <Stack.Screen name="paywall" />
    </Stack>
  );
}