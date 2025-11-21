import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '../../providers/ThemeProvider';

export default function StockGridLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        // Present as a full-screen modal, preventing easy dismissal
        presentation: 'modal',
        // Hide the header bar
        headerShown: false,
        // Ensure the content background matches the theme
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="[storageId]" />
    </Stack>
  );
}