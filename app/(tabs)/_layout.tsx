import { Tabs } from 'expo-router';
import React from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';

export default function TabLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme(); // Correct way to get colors

  return (
    <Tabs
        screenOptions={{
        tabBarActiveTintColor: colors.selector,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.card, borderBottomrColor: colors.border,
        },
        headerTintColor: colors.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          headerShown: false,
          tabBarIcon: ({ color }) => <FontAwesome name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="warehouse" 
        options={{
          title: '',
          headerShown: false,
          tabBarIcon: ({ color }) => <FontAwesome name="industry" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '',
          headerShown: true,
          tabBarIcon: ({ color }) => <FontAwesome name="cog" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}