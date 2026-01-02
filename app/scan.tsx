import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
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

  // --- COPILOT STATE ---
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [tourStarted, setTourStarted] = useState(false);
  
  const { start: startTour } = useCopilot();

  // --- START TOUR AFTER LAYOUT IS READY ---
  useEffect(() => {
    if (loading || !isLayoutReady || tourStarted) return;

    const checkAndStartTour = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem('HAS_SEEN_SCAN_TOUR');
        if (!hasSeen) {
          // Wait for components to be measured
          setTimeout(() => {
            startTour();
            setTourStarted(true);
          }, 800);
          await AsyncStorage.setItem('HAS_SEEN_SCAN_TOUR', 'true');
        }
      } catch (e) { 
        console.warn('Tour check failed', e); 
      }
    };
    
    checkAndStartTour();
  }, [loading, isLayoutReady, tourStarted]);

  // --- MAIN SCAN FUNCTION ---
  const handleManualScan = async () => {
    if (!barcode.trim()) {
      showError(t('general.error'), t('scan.enterBarcode'));
      return;
    }

    setLoading(true);

    try {
      // Search for item by barcode
      const { data: items, error: searchError } = await supabase
        .from('items')
        .select('id, name, barcode')
        .eq('barcode', barcode.trim())
        .limit(1);

      if (searchError) throw searchError;

      if (items && items.length > 0) {
        // Item found - navigate to edit page
        const item = items[0];
        showSuccess(t('general.success'), t('scan.itemFound', { name: item.name }));
        router.push(`/edit-item/${item.id}`);
        setBarcode(''); // Clear input
      } else {
        // No item found
        showError(t('scan.notFound'), t('scan.noItemWithBarcode'));
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      showError(t('general.error'), error.message || t('scan.scanError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View 
      style={[styles.container, { backgroundColor: colors.background }]}
      onLayout={() => setIsLayoutReady(true)}
    >
      <Text style={[typography.h1, styles.title, { color: colors.text }]}>
        {t('scan.manualEntryTitle')}
      </Text>
      
      <Text style={[typography.body, styles.subtitle, { color: colors.subtext }]}>
        {t('scan.manualEntrySubtitle') || 'Enter a barcode number to find an item'}
      </Text>
      
      {/* Step 1: Barcode Input */}
      <CopilotStep 
        text={t('pilot.notavailable') || "Enter a barcode number manually to search for items."} 
        order={1} 
        name="manualInput"
      >
        <WalkableTextInput
          collapsable={false}
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder={t('scan.enterNum')}
          placeholderTextColor={colors.subtext}
          value={barcode}
          onChangeText={setBarcode}
          keyboardType="numeric"
          returnKeyType="search"
          onSubmitEditing={handleManualScan}
          editable={!loading}
        />
      </CopilotStep>

      {/* Step 2: Submit Button */}
      <CopilotStep 
        text={t('pilot.barcodescan') || "Tap here to search for the item by barcode."} 
        order={2} 
        name="submitBtn"
      >
        <WalkablePressable 
          collapsable={false}
          style={[
            styles.button, 
            { backgroundColor: loading ? colors.border : colors.primary }
          ]} 
          onPress={handleManualScan}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={[typography.button, styles.buttonText, { color: colors.primaryText }]}>
              {t('scan.submitBarcode')}
            </Text>
          )}
        </WalkablePressable>
      </CopilotStep>

      {/* Optional: Add camera scan button in the future */}
      {/* <Pressable 
        style={[styles.cameraButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          // TODO: Implement camera barcode scanning
          showError(t('general.error'), t('scan.cameraNotAvailable'));
        }}
      >
        <FontAwesome name="camera" size={24} color={colors.text} />
        <Text style={[typography.body, { color: colors.text, marginTop: 8 }]}>
          {t('scan.scanWithCamera')}
        </Text>
      </Pressable> */}
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
    fontSize: 18,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  buttonText: {
    fontWeight: 'bold',
  },
  cameraButton: {
    marginTop: 24,
    padding: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});