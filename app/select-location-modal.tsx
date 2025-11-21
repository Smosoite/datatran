import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { DropdownPicker } from '../components/dropdownPicker';
import { useTheme } from '../providers/ThemeProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';

export default function SelectLocationModal() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme(); // --- FIX: Correct way to get colors ---
  const { barcode } = useLocalSearchParams<{ barcode?: string }>();
  
  const [warehouses, setWarehouses] = useState<{ label: string; value: string }[]>([]);
  const [storages, setStorages] = useState<{ label: string; value: string }[]>([]);
  
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);

  // Fetch all warehouses on load
  useEffect(() => {
    const fetchWarehouses = async () => {
      const { data, error } = await supabase.from('warehouses').select('id, name');
      if (data) setWarehouses(data.map(w => ({ label: w.name, value: w.id })));
    };
    fetchWarehouses();
  }, []);

  // Fetch storages whenever a warehouse is selected
  useEffect(() => {
    if (!selectedWarehouse) {
      setStorages([]);
      return;
    }
    const fetchStorages = async () => {
      const { data, error } = await supabase.from('storages').select('id, name').eq('warehouse_id', selectedWarehouse);
      if (data) setStorages(data.map(s => ({ label: s.name, value: s.id })));
    };
    fetchStorages();
  }, [selectedWarehouse]);

  const handleContinue = () => {
    if (!selectedWarehouse || !selectedStorage) {
      showError(error.message);( t('general.selectReq'), t('general.selectBoth'));
      return;
    }
    router.push({
      pathname: '/add-item',
      params: { warehouseId: selectedWarehouse, storageId: selectedStorage, barcode: barcode }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={typography.body, styles.header, { color: colors.text }}>{t('location.selectLocation')}</Text>

      <DropdownPicker
        label={t('warehouse.title')}
        placeholder={t('warehouse.selectPlaceholder')}
        options={warehouses}
        selectedValue={selectedWarehouse}
        onValueChange={(value) => {
          setSelectedWarehouse(value);
          setSelectedStorage(null);
        }}
      />
      
      {selectedWarehouse && (
        <DropdownPicker
          label={t('storage.title')}
          placeholder={t('storage.selectPlaceholder')}
          options={storages}
          selectedValue={selectedStorage}
          onValueChange={setSelectedStorage}
        />
      )}
      
      <Pressable
        style={[
          styles.button, 
          { backgroundColor: colors.primary }, 
          (!selectedWarehouse || !selectedStorage) && styles.disabledButton
        ]}
        onPress={handleContinue}
        disabled={!selectedWarehouse || !selectedStorage}
      >
        <Text style={[typography.button, styles.buttonText, { color: colors.text }]}>{t('general.cont')}</Text>
      </Pressable>
    </View>
  );
}

// --- FIX: Stylesheet cleaned of hard-coded colors ---
const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  header: { fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  buttonText: { fontWeight: 'bold' },
  disabledButton: { opacity: 0.5 }, // A better way to show disabled state
});