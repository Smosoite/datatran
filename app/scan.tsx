import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Text, View, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';

export default function ScanScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme(); // --- FIX: Correct way to get colors ---
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleManualScan = async () => {
    if (!barcode.trim()) {
      showError(error.message);(t('general.addBarcode'));
      return;
    }

    setLoading(true);
    try {
      const { data: item, error } = await supabase
        .from('items')
        .select('id')
        .eq('barcode', barcode.trim())
        .single();

      // 'PGRST116' is the code for "no rows found", which is not an error in this case.
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (item) {
        // Item exists, navigate to edit it.
        router.push(`/edit-item/${item.id}`);
      } else {
        // Item does not exist, navigate to add it.
        router.push({ 
          pathname: '/select-location-modal', 
          params: { barcode: barcode.trim() } 
        });
      }

    } catch (error: any) {
      showError(error.message);(t('general.error'), error.message);
      setLoading(false); // Only set loading false if an error occurs and we don't navigate
    }
    // On success, we navigate away, so we don't need to set loading to false.
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.h1, styles.title, { color: colors.text }]}>{t('scan.manualEntryTitle')}</Text>
      <Text style={[typography.h3, styles.subtitle, { color: colors.subtext }]}>{t('scan.manualEntrySub')}</Text>
      
      <TextInput
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder={t('scan.enterNum')}
        placeholderTextColor={colors.subtext}
        value={barcode}
        onChangeText={setBarcode}
        keyboardType="numeric"
        onSubmitEditing={handleManualScan}
      />
      
      {/* --- FIX: Improved button with loading indicator inside --- */}
      <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleManualScan} disabled={loading}>
        {loading ? (
            <ActivityIndicator color={colors.text || '#fff'} />
        ) : (
            <Text style={[typography.button, styles.buttonText, { color: colors.text || '#fff' }]}>{t('scan.submitBarcode')}</Text>
        )}
      </Pressable>
    </View>
  );
}

// --- FIX: Stylesheet cleaned of hard-coded colors ---
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