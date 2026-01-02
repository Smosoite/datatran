import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';

// --- COPILOT IMPORTS ---
import { CopilotStep, walkthroughable, useCopilot } from "react-native-copilot";
import AsyncStorage from '@react-native-async-storage/async-storage';

const WalkableTextInput = walkthroughable(TextInput);
const WalkablePressable = walkthroughable(Pressable);

export default function ScanScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme(); 
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
// 1. ADD LAYOUT STATE
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  
  const { start: startTour } = useCopilot();

  // 2. MODIFIED TOUR LOGIC
  useEffect(() => {
    // Only proceed if data isn't loading AND the UI has finished layout
    if (loading || !isLayoutReady) return;

    const checkFirstTime = async () => {
        try {
            const hasSeen = await AsyncStorage.getItem('HAS_SEEN_SCAN_TOUR');
            if (!hasSeen) {
                // Give a tiny 100ms grace period for the spotlight to catch up
                setTimeout(() => startTour(), 100); 
                await AsyncStorage.setItem('HAS_SEEN_SCAN_TOUR', 'true');
            }
        } catch (e) { console.warn(e); }
    };
    checkFirstTime();
  }, [loading, isLayoutReady]); // Depend on layout state

  return (
    <View 
      style={[styles.container, { backgroundColor: colors.background }]}
      // 3. CAPTURE THE LAYOUT EVENT
      onLayout={() => setIsLayoutReady(true)}
    >
      <Text style={[typography.h1, styles.title, { color: colors.text }]}>{t('scan.manualEntryTitle')}</Text>
      
      {/* 4. ENSURE WALKABLES ARE NOT COLLAPSABLE */}
      <CopilotStep text={t('pilot.notavailable')} order={1} name="manualInput">
          <WalkableTextInput
            collapsable={false} // Crucial for Android
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder={t('scan.enterNum')}
            value={barcode}
            onChangeText={setBarcode}
          />
      </CopilotStep>

      <CopilotStep text={t('pilot.barcodescan')} order={2} name="submitBtn">
          <WalkablePressable 
            collapsable={false} // Crucial for Android
            style={[styles.button, { backgroundColor: colors.primary }]} 
            onPress={handleManualScan}
          >
            <Text style={{ color: colors.text }}>{t('scan.submitBarcode')}</Text>
          </WalkablePressable>
      </CopilotStep>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: 'bold',
  },
});