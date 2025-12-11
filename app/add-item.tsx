import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import { DropdownPicker } from '../components/dropdownPicker';
import { FontAwesome } from '@expo/vector-icons';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';

type DefinedLocation = { 
  id: string; 
  shelf: string; 
  row: string | null; 
  column: string | null;
  items: { name: string }[] | null;
};

export default function AddItemScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  
  // Incoming param
  const { barcode: initialBarcode } = useLocalSearchParams<{ barcode?: string }>();
  
  const { colors } = useTheme();

  // Form state
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [restockThreshold, setRestockThreshold] = useState('');
  const [itemBarcode, setItemBarcode] = useState(initialBarcode || null);
  
  const [loading, setLoading] = useState(false);

  // State for location selections
  const [warehouses, setWarehouses] = useState<{ label: string; value: string }[]>([]);
  const [storages, setStorages] = useState<{ label: string; value: string }[]>([]);
  const [allLocations, setAllLocations] = useState<DefinedLocation[]>([]);
  
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  const [selectedShelf, setSelectedShelf] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [locationOccupant, setLocationOccupant] = useState<string | null>(null);

  const { warehouseId, storageId } = useLocalSearchParams<{ warehouseId?: string; storageId?: string }>();

  // Fetch warehouses
  useEffect(() => {
    const fetchWarehouses = async () => {
      const { data } = await supabase.from('warehouses').select('id, name');
      if (data) {
        setWarehouses(data.map(w => ({ label: w.name, value: w.id })));
        if (warehouseId) setSelectedWarehouse(warehouseId);
      }
    };
    fetchWarehouses();
  }, [warehouseId]);

  // Fetch storages
  useEffect(() => {
    if (!selectedWarehouse) {
      setStorages([]);
      setAllLocations([]);
      return;
    }
    const fetchStorages = async () => {
      const { data } = await supabase.from('storages').select('id, name').eq('warehouse_id', selectedWarehouse);
      if (data) {
        setStorages(data.map(s => ({ label: s.name, value: s.id })));
        if (storageId) setSelectedStorage(storageId);
      }
    };
    fetchStorages();
  }, [selectedWarehouse, storageId]);

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      if (!selectedStorage) {
        setAllLocations([]);
        return;
      };
      const { data, error } = await supabase
        .from('defined_locations')
        .select('id, shelf, row, column, items ( name )')
        .eq('storage_id', selectedStorage);
      
      if (error) {
          showError(t('general.error'), t('general.locationError'));
      } else {
        setAllLocations(data || []);
      }
    };
    fetchLocations();
  }, [selectedStorage, t]);
  
  // --- Memoized Options ---

  // 1. Shelf Options
  const shelfOptions = useMemo(() => [...new Set(allLocations.map(l => l.shelf))].map(s => ({ label: s, value: s })), [allLocations]);
  
  // 2. Row Options
  const rowOptions = useMemo(() => {
    if (!selectedShelf) return [];
    const rows = [...new Set(allLocations.filter(l => l.shelf === selectedShelf).map(l => l.row).filter(Boolean))] as string[];
    return rows.map(r => ({ label: r, value: r }));
  }, [allLocations, selectedShelf]);

  // 3. Column Options (FIXED LOGIC)
  const columnOptions = useMemo(() => {
    if (!selectedShelf) return [];

    const byShelf = allLocations.filter(l => l.shelf === selectedShelf);

    if (selectedRow) {
      // Standard Case: Filter by Selected Row
      return [...new Set(byShelf.filter(l => l.row === selectedRow).map(l => l.column).filter(Boolean))]
        .map(c => ({ label: c, value: c }));
    } else {
      // "No Row" Case: Filter for columns where row is null
      // This allows selecting columns even if the location has no rows defined
      return [...new Set(byShelf.filter(l => l.row === null).map(l => l.column).filter(Boolean))]
        .map(c => ({ label: c, value: c }));
    }
  }, [allLocations, selectedShelf, selectedRow]);

  // Find location ID
  useEffect(() => {
    if (!selectedShelf) {
        setSelectedLocationId(null);
        return;
    }
    const findLogic = (l: DefinedLocation) => 
        l.shelf === selectedShelf && 
        (l.row || null) === selectedRow && 
        (l.column || null) === selectedColumn;

    const finalLocation = allLocations.find(findLogic);
    setSelectedLocationId(finalLocation ? finalLocation.id : null);
  }, [selectedShelf, selectedRow, selectedColumn, allLocations]);

  // Check occupant
  useEffect(() => {
    if (!selectedLocationId) {
      setLocationOccupant(null);
      return;
    }
    const finalLocation = allLocations.find(l => l.id === selectedLocationId);
    const occupant = finalLocation?.items?.[0];
    setLocationOccupant(occupant ? occupant.name : null);
  }, [selectedLocationId, allLocations]);
  
  const handleAddItem = async () => {
    if (!name.trim() || !quantity || !restockThreshold || !selectedWarehouse || !selectedStorage) {
      showError(t('general.error'), t('general.fillFields'));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.rpc('add_new_item', {
        p_name: name.trim(),
        p_quantity: parseInt(quantity, 10),
        p_restock_threshold: parseInt(restockThreshold, 10),
        p_warehouse_id: selectedWarehouse,
        p_storage_id: selectedStorage,
        p_location_id: selectedLocationId,
        p_workgroup_id: profile.workgroup_id,
        p_barcode: itemBarcode,
      });

      if (error) throw error;
      
      showSuccess(t('general.success'), t('general.addSuccess'));

      // Reset Form
      setName('');
      setQuantity('');
      setRestockThreshold('');
      setItemBarcode(null);
      
      setSelectedShelf(null);
      setSelectedRow(null);
      setSelectedColumn(null);

    } catch (error: any) {
      showError(t('general.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
        style={{ flex: 1, backgroundColor: colors.background }} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        {itemBarcode && (
             <View style={{ position: 'absolute', left: 0, backgroundColor: colors.primaryMuted, padding: 4, borderRadius: 4 }}>
                <FontAwesome name="barcode" size={16} color={colors.primary} />
             </View>
        )}
        <Text style={[typography.h1, { color: colors.text }]}>{t('item.addHeader')}</Text>
      </View>

      <DropdownPicker
        label={t('warehouse.title')}
        placeholder={t('warehouse.selectPlaceholder')}
        options={warehouses}
        selectedValue={selectedWarehouse}
        onValueChange={(value) => {
          setSelectedWarehouse(value);
          setSelectedStorage(null);
          setSelectedShelf(null);
          setSelectedRow(null);
          setSelectedColumn(null);
        }}
      />
      {selectedWarehouse && (
        <DropdownPicker
          label={t('storage.title')}
          placeholder={t('storage.selectPlaceholder')}
          options={storages}
          selectedValue={selectedStorage}
          onValueChange={(value) => {
            setSelectedStorage(value);
            setSelectedShelf(null);
            setSelectedRow(null);
            setSelectedColumn(null);
          }}
        />
      )}

      <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('item.name')}</Text>
      <TextInput 
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
        value={name} 
        onChangeText={setName} 
        placeholder="e.g. Copper Wire Spool"
        placeholderTextColor={colors.subtext}
      />

      <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('item.quantity')}</Text>
      <TextInput 
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
        value={quantity} 
        onChangeText={setQuantity} 
        keyboardType="numeric" 
      />

      <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('item.restockThreshold')}</Text>
      <TextInput 
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
        value={restockThreshold} 
        onChangeText={setRestockThreshold} 
        keyboardType="numeric" 
      />

      {selectedStorage && shelfOptions.length > 0 && (
        <>
          <Text style={[typography.h2, styles.sectionHeader, { color: colors.text, borderBottomColor: colors.border }]}>{t('item.location')}</Text>
          <DropdownPicker
            label={t('location.shelf')}
            placeholder={t('location.shelfSelect')}
            options={shelfOptions}
            selectedValue={selectedShelf}
            onValueChange={(value) => {
              setSelectedShelf(value);
              setSelectedRow(null);
              setSelectedColumn(null);
            }}
          />
          {selectedShelf && rowOptions.length > 0 && (
            <DropdownPicker
              label={t('location.row')}
              placeholder={t('location.rowSelect')}
              options={rowOptions}
              selectedValue={selectedRow}
              onValueChange={(value) => {
                setSelectedRow(value);
                setSelectedColumn(null); 
              }}
            />
          )}
          
          {/* --- FIX: Show Column Picker even if no Row is selected (if columns exist) --- */}
          {selectedShelf && columnOptions.length > 0 && (
            <DropdownPicker
              label={t('location.column')}
              placeholder={t('location.columnSelect')}
              options={columnOptions}
              selectedValue={selectedColumn}
              onValueChange={setSelectedColumn}
            />
          )}

          {locationOccupant && (
            <View style={styles.warningContainer}>
              <FontAwesome name="warning" size={16} color={colors.danger} />
              <Text style={[typography.h3, styles.warningText, { color: colors.danger }]}>
                {t('item.locationOccupied', { itemName: locationOccupant })}
              </Text>
            </View>
          )}
        </>
      )}
      
      <Pressable 
        style={[styles.button, { backgroundColor: colors.primary }]} 
        onPress={handleAddItem} 
        disabled={loading || !!locationOccupant}
      >
        {loading ? (
          <ActivityIndicator color={colors.text || '#fff'} />
        ) : (
          <Text style={[typography.button, styles.buttonText, { color: colors.text || '#fff' }]}>{t('item.addButton')}</Text>
        )}
      </Pressable>

       <Pressable 
        style={[styles.button, { backgroundColor: 'transparent', marginTop: 10, borderWidth: 1, borderColor: colors.border }]} 
        onPress={() => router.back()}
      >
         <Text style={[typography.button, styles.buttonText, { color: colors.text }]}>{t('general.close', 'Done')}</Text>
      </Pressable>
      
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
    contentContainer: { padding: 20 },
    sectionHeader: { fontWeight: '600', marginTop: 20, marginBottom: 15, borderBottomWidth: 1, paddingBottom: 5 },
    label: { marginBottom: 8, fontWeight: '500' },
    input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 20 },
    button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    buttonText: { fontWeight: 'bold' },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        marginBottom: 20,
    },
    warningText: {
        marginLeft: 10,
        fontWeight: '500',
    },
});