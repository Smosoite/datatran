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

  // --- COPILOT HOOK ---
  const { start: startTour } = useCopilot();

  // --- START TOUR ON MOUNT (ONCE) ---
  useEffect(() => {
    const checkFirstTime = async () => {
        try {
            const hasSeen = await AsyncStorage.getItem('HAS_SEEN_SCAN_TOUR');
            if (!hasSeen) {
                setTimeout(() => startTour(), 500);
                await AsyncStorage.setItem('HAS_SEEN_SCAN_TOUR', 'true');
            }
        } catch (e) {
            console.warn("Tour check failed", e);
        }
    };
    checkFirstTime();
  }, []);

  const handleManualScan = async () => {
    if (!barcode.trim()) {
      showError(t('general.addBarcode'));
      return;
    }

    setLoading(true);
    try {
      const { data: item, error } = await supabase
        .from('items')
        .select('id')
        .eq('barcode', barcode.trim())
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (item) {
        router.push(`/edit-item/${item.id}`);
      } else {
        router.push({ 
          pathname: '/select-location-modal', 
          params: { barcode: barcode.trim() } 
        });
      }

    } catch (error: any) {
      showError(t('general.error'), error.message);
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.h1, styles.title, { color: colors.text }]}>{t('scan.manualEntryTitle')}</Text>
      <Text style={[typography.h3, styles.subtitle, { color: colors.subtext }]}>{t('scan.manualEntrySub')}</Text>
      
      {/* STEP 1: Input Field */}
      <CopilotStep text="Can't scan? Type the barcode number here manually." order={1} name="manualInput">
          <WalkableTextInput
            style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder={t('scan.enterNum')}
            placeholderTextColor={colors.subtext}
            value={barcode}
            onChangeText={setBarcode}
            keyboardType="numeric"
            onSubmitEditing={handleManualScan}
          />
      </CopilotStep>
      
      {/* STEP 2: Submit Button */}
      <CopilotStep text="Tap here to search the database for this barcode." order={2} name="submitBtn">
          <WalkablePressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleManualScan} disabled={loading}>
            {loading ? (
                <ActivityIndicator color={colors.text || '#fff'} />
            ) : (
                <Text style={[typography.button, styles.buttonText, { color: colors.text || '#fff' }]}>{t('scan.submitBarcode')}</Text>
            )}
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