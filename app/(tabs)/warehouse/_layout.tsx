import { Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../providers/ThemeProvider';

export default function WarehouseLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ title: '' }} // Added title
      />
      <Stack.Screen 
        name="[id]" 
        options={{ title: t('warehouse.manageHeader') }}
      />
    </Stack>
  );
}