import React, { createContext, useState, useEffect, useContext, PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Step 1: Define our t.wo distinct concepts: Mode and Theme
type Mode = 'light' | 'dark';
type Theme = 'default' | 'industrial' | 'forest' | 'cherryblossom' | 'sunflower' | 'sunset' ;

// Step 2: Re-create the nested Colors object with assll variants
export const Colors = {
  light: {
    default: {
      background: '#F5F7FA',
      card: '#FFFFFF',
      text: '#1F2937',
      subtext: '#6B7280',
      primary: '#2E7EEA',
      primaryText: '#FFFFFF',
      selector: '#2E7EEA',
      border: '#E5E7EB',
      success: '#10B981',
      danger: '#EF4444',
      warning: '#F59E0B',
      primaryMuted: 'rgba(46, 126, 234, 0.1)',
      textShadow: '#FFFFFF',
      textWhite: '#FFFFFF',
      cardShadow: 'rgba(0, 0, 0, 0.05)',
      accent: '#8B5CF6',
    },
    industrial: {
     background: '#F3F4F6',
      card: '#FFFFFF',
      text: '#111827',
      subtext: '#6B7280',
      primary: '#D97706',
      primaryText: '#FFFFFF',
      selector: '#C9C9C9',
      border: '#D1D5DB',
      success: '#059669',
      danger: '#DC2626',
      primaryMuted: 'rgba(217, 119, 6, 0.1)',
      textShadow: '#FFFFFF',
      textWhite: '#FFFFFF',
    },
    forest: {
      background: '#F3F4F6',
      card: '#FFFFFF',
      text: '#111827',
      subtext: '#6B7280',
      primary: '#D97706',
      primaryText: '#FFFFFF',
      selector: '#064D06',
      border: '#D1D5DB',
      success: '#059669',
      danger: '#DC2626',
      primaryMuted: 'rgba(217, 119, 6, 0.1)',
      textShadow: '#FFFFFF',
      textWhite: '#FFFFFF',
    },
    cherryblossom: {
     background: '#F3F4F6',
      card: '#FFFFFF',
      text: '#111827',
      subtext: '#6B7280',
      primary: '#D97706',
      primaryText: '#FFFFFF',
      selector: '#EBC7D4',
      border: '#D1D5DB',
      success: '#059669',
      danger: '#DC2626',
      primaryMuted: 'rgba(217, 119, 6, 0.1)',
      textShadow: '#FFFFFF',
      textWhite: '#FFFFFF',
    },
    sunflower: {
     background: '#F3F4F6',
      card: '#FFFFFF',
      text: '#111827',
      subtext: '#6B7280',
      primary: '#D97706',
      primaryText: '#FFFFFF',
      selector: '#FFEA00',
      border: '#D1D5DB',
      success: '#059669',
      danger: '#DC2626',
      primaryMuted: 'rgba(217, 119, 6, 0.1)',
      textShadow: '#FFFFFF',
      textWhite: '#FFFFFF',
    },
    sunset: {
     background: '#F3F4F6',
      card: '#FFFFFF',
      text: '#111827',
      subtext: '#6B7280',
      primary: '#D97706',
      primaryText: '#FFFFFF',
      selector: '#D93000',
      border: '#D1D5DB',
      success: '#059669',
      danger: '#DC2626',
      primaryMuted: 'rgba(217, 119, 6, 0.1)',
      textShadow: '#FFFFFF',
      textWhite: '#FFFFFF',
    },
  },
  dark: {
    default: {
     background: '#1F2937',
      card: '#374151',
      text: '#E5E7EB',
      subtext: '#9CA3AF',
      primary: '#FBBF24',
      primaryText: '#111827',
      selector: '#10567A',
      border: '#4B5563',
      success: '#34D399',
      danger: '#F87171',
      primaryMuted: 'rgba(251, 191, 36, 0.15)',
      textShadow: '#1F2937',
      textWhite: '#a3adbf',
    },
    industrial: {
      background: '#1F2937',
      card: '#374151',
      text: '#E5E7EB',
      subtext: '#9CA3AF',
      primary: '#FBBF24',
      primaryText: '#111827',
      selector: '#C9C9C9',
      border: '#4B5563',
      success: '#34D399',
      danger: '#F87171',
      primaryMuted: 'rgba(251, 191, 36, 0.15)',
      textShadow: '#1F2937',
      textWhite: '#a3adbf',
    },
    forest: {
      background: '#1F2937',
      card: '#374151',
      text: '#E5E7EB',
      subtext: '#9CA3AF',
      primary: '#FBBF24',
      primaryText: '#111827',
      selector: '#064D06',
      border: '#4B5563',
      success: '#34D399',
      danger: '#F87171',
      primaryMuted: 'rgba(251, 191, 36, 0.15)',
      textShadow: '#1F2937',
      textWhite: '#a3adbf',
    },
    cherryblossom: {
      background: '#1F2937',
      card: '#374151',
      text: '#E5E7EB',
      subtext: '#9CA3AF',
      primary: '#FBBF24',
      primaryText: '#111827',
      selector: '#EBC7D4',
      border: '#4B5563',
      success: '#34D399',
      danger: '#F87171',
      primaryMuted: 'rgba(251, 191, 36, 0.15)',
      textShadow: '#1F2937',
      textWhite: '#a3adbf',
    },
    sunflower: {
      background: '#1F2937',
      card: '#374151',
      text: '#E5E7EB',
      subtext: '#9CA3AF',
      primary: '#FBBF24',
      primaryText: '#111827',
      selector: '#FFEA00',
      border: '#4B5563',
      success: '#34D399',
      danger: '#F87171',
      primaryMuted: 'rgba(251, 191, 36, 0.15)',
      textShadow: '#1F2937',
      textWhite: '#a3adbf',
    },
    sunset: {
      background: '#1F2937',
      card: '#374151',
      text: '#E5E7EB',
      subtext: '#9CA3AF',
      primary: '#FBBF24',
      primaryText: '#111827',
      selector: '#D93000',
      border: '#4B5563',
      success: '#34D399',
      danger: '#F87171',
      primaryMuted: 'rgba(251, 191, 36, 0.15)',
      textShadow: '#1F2937',
      textWhite: '#a3adbf',
  },
},
};

// Step 3: Update the context type to provide everything we need 631b26
type ThemeContextType = {
  mode: Mode;
  setMode: (mode: Mode) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colors: typeof Colors.light.default; 
};

const ThemeContext = createContext<ThemeContextType>(null!);

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const systemMode = useColorScheme() || 'light';
  // Step 4: Manage state for both mode and theme
  const [mode, setMode] = useState<Mode>(systemMode);
  const [theme, setTheme] = useState<Theme>('default');

  useEffect(() => {
    const loadPreferences = async () => {
      // Load both saved mode and theme
      const savedMode = await AsyncStorage.getItem('app-mode') as Mode | null;
      const savedTheme = await AsyncStorage.getItem('app-theme') as Theme | null;
      if (savedMode) setMode(savedMode);
      if (savedTheme) setTheme(savedTheme);
    };
    loadPreferences();
  }, []);
  
  // Create separate handlers for updating mode and theme
  const handleSetMode = (newMode: Mode) => {
    setMode(newMode);
    AsyncStorage.setItem('app-mode', newMode);
  };
  
  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    AsyncStorage.setItem('app-theme', newTheme);
  };

  // Step 5: Safely calculate the final colors object with fallbacks
  const colors = Colors[mode]?.[theme] || Colors[mode]?.default || Colors.light.default;

  return (
    <ThemeContext.Provider value={{ mode, setMode: handleSetMode, theme, setTheme: handleSetTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);