import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { useModal } from '../providers/ModalProvider';
import { showSuccess } from '../lib/toast'; // Keep showSuccess for the final toast
import { typography } from '../styles/typography';

type IdentifierType = 'numerical' | 'alphabetical';

// --- SAFETY LIMITS ---
const MAX_SHELVES = 50;
const MAX_ROWS = 20;
const MAX_COLS = 20;
const MAX_TOTAL_LOCATIONS = 400;

// --- FIX 1: Moved Component Outside to prevent re-renders ---
const IdentifierSelector = ({ value, onValueChange, colors }: { value: IdentifierType; onValueChange: (type: IdentifierType) => void, colors: any }) => (
  <View style={styles.selectorContainer}>
    <Pressable 
      style={[styles.selectorButton, { borderColor: colors.border }, value === 'alphabetical' && styles.selectorSelected]} 
      onPress={() => onValueChange('alphabetical')}
    >
      <Text style={[typography.body, styles.selectorText, { color: colors.primary }, value === 'alphabetical' && styles.selectorSelectedText]}>A, B, C...</Text>
    </Pressable>
    <Pressable 
      style={[styles.selectorButton, { borderColor: colors.border }, value === 'numerical' && styles.selectorSelected]} 
      onPress={() => onValueChange('numerical')}
    >
      <Text style={[typography.body, styles.selectorText, { color: colors.primary }, value === 'numerical' && styles.selectorSelectedText]}>1, 2, 3...</Text>
    </Pressable>
  </View>
);

export default function CreateLocationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme(); 
  const { showConfirmation } = useModal();
  const { storageId } = useLocalSearchParams<{ storageId: string }>();
  
  const [shelfCount, setShelfCount] = useState('');
  const [shelfType, setShelfType] = useState<IdentifierType>('alphabetical');
  const [rowCount, setRowCount] = useState('');
  const [rowType, setRowType] = useState<IdentifierType>('numerical');
  const [colCount, setColCount] = useState('');
  const [colType, setColType] = useState<IdentifierType>('numerical');
  
  const [loading, setLoading] = useState(false);

  const generateLabels = (countStr: string, type: IdentifierType): string[] => {
    const count = parseInt(countStr, 10);
    if (isNaN(count) || count <= 0) return [];
    
    if (type === 'alphabetical') {
      return Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
    } else {
      return Array.from({ length: count }, (_, i) => (i + 1).toString());
    }
  };

  const handleBulkCreate = async () => {
    // --- FIX 2: Use Alert instead of showError so it appears ON TOP of the modal ---
    if (!storageId) {
      Alert.alert(t('general.error'), t('general.noStorID'));
      return;
    }

    if (!shelfCount.trim()) {
      Alert.alert(t('general.error'), t('general.shelfEnter'));
      return;
    }

    // --- NEW: Validate Limits ---
    const sCount = parseInt(shelfCount, 10);
    const rCount = rowCount ? parseInt(rowCount, 10) : 1;
    const cCount = colCount ? parseInt(colCount, 10) : 1;

    if (sCount > MAX_SHELVES) {
      Alert.alert(t('general.error'), `Max shelves allowed: ${MAX_SHELVES}`);
      return;
    }
    if (rCount > MAX_ROWS) {
      Alert.alert(t('general.error'), `Max rows allowed: ${MAX_ROWS}`);
      return;
    }
    if (cCount > MAX_COLS) {
      Alert.alert(t('general.error'), `Max columns allowed: ${MAX_COLS}`);
      return;
    }

    const totalEstimate = sCount * rCount * cCount;
    if (totalEstimate > MAX_TOTAL_LOCATIONS) {
      Alert.alert(
        t('general.error'), 
        `Total locations (${totalEstimate}) exceeds the safe limit of ${MAX_TOTAL_LOCATIONS} at once.`
      );
      return;
    }
    
    const shelfLabels = generateLabels(shelfCount, shelfType);
    const rowLabels = rowCount ? generateLabels(rowCount, rowType) : [null];
    const colLabels = colCount ? generateLabels(colCount, colType) : [null];

    const locationsToInsert = [];
    for (const shelf of shelfLabels) {
      for (const row of rowLabels) {
        for (const col of colLabels) {
          locationsToInsert.push({
            storage_id: storageId,
            shelf: shelf,
            row: row,
            column: col,
            container: null,
          });
        }
      }
    }
    
    if (locationsToInsert.length === 0) {
      Alert.alert(t('general.error'), t('general.nothing'));
      return;
    }
    
    showConfirmation({
      title: 'general.creation',
      message: t('general.thisWill', { count: locationsToInsert.length }),
      confirmText: 'general.yes',
      onConfirm: async () => {
        setLoading(true);
        try {
          const { error } = await supabase.from('defined_locations').insert(locationsToInsert);
          if (error) throw error;

          // Toast usually works on navigation back because the modal closes
          showSuccess(t('location.creationSuccess', { count: locationsToInsert.length }));
          router.back();
        } catch (error: any) {
          // Use Alert here too just in case
          Alert.alert(t('general.error'), error.message);
        } finally {
          setLoading(false);
        }
      } 
    });
  };
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.h1, styles.header, { color: colors.text }]}>{t('location.generatorHeader')}</Text>
      
      <View style={[styles.dimensionContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('location.numShelves')}</Text>
        <TextInput 
            style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
            placeholder="e.g., 5" 
            placeholderTextColor={colors.subtext}
            value={shelfCount} 
            onChangeText={setShelfCount} 
            keyboardType="number-pad" 
        />
        <IdentifierSelector value={shelfType} onValueChange={setShelfType} colors={colors} />
      </View>
      
      <View style={[styles.dimensionContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('location.numRows')}</Text>
        <TextInput 
            style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
            placeholder="e.g., 10" 
            placeholderTextColor={colors.subtext}
            value={rowCount} 
            onChangeText={setRowCount} 
            keyboardType="number-pad" 
        />
        <IdentifierSelector value={rowType} onValueChange={setRowType} colors={colors} />
      </View>

      <View style={[styles.dimensionContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('location.numCols')}</Text>
        <TextInput 
            style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
            placeholder="e.g., 4" 
            placeholderTextColor={colors.subtext}
            value={colCount} 
            onChangeText={setColCount} 
            keyboardType="number-pad" 
        />
        <IdentifierSelector value={colType} onValueChange={setColType} colors={colors} />
      </View>
      
      <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleBulkCreate} disabled={loading}>
        {loading ? (
            <ActivityIndicator color={colors.text || '#fff'} />
        ) : (
            <Text style={[typography.button, styles.buttonText, { color: colors.text || '#fff' }]}>{t('location.generatorButton')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  header: { fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  dimensionContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
  },
  label: { marginBottom: 8, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  selectorContainer: {
    flexDirection: 'row',
  },
  selectorButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  selectorText: {},
  selectorSelected: {
    // Optional: Add a background color for selected state if desired
    opacity: 1
  },
  selectorSelectedText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 40 },
  buttonText: { fontWeight: 'bold' },
});