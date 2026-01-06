import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import { DropdownPicker } from '../components/dropdownPicker';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';

// --- COPILOT IMPORTS ---
import { CopilotStep, walkthroughable, useCopilot } from "react-native-copilot";
import AsyncStorage from '@react-native-async-storage/async-storage';

const WalkableTextInput = walkthroughable(TextInput);
const WalkableView = walkthroughable(View);
const WalkablePressable = walkthroughable(Pressable);

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
  const { start: startTour } = useCopilot();
   
  const { barcode: initialBarcode } = useLocalSearchParams<{ barcode?: string }>();
  const { colors } = useTheme();

  // Form state
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [restockThreshold, setRestockThreshold] = useState('');
  const [itemBarcode, setItemBarcode] = useState(initialBarcode || null);
  const [loading, setLoading] = useState(false);

  // Layout State for Tour
  const [isLayoutReady, setIsLayoutReady] = useState(false);

  // State for location selections
  const [warehouses, setWarehouses] = useState<{ label: string; value: string }[]>([]);
  const [storages, setStorages] = useState<{ label: string; value: string }[]>([]);
  const [allLocations, setAllLocations] = useState<DefinedLocation[]>([]);
   
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  const [selectedShelf, setSelectedShelf] = useState<string | null>(null);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  const { warehouseId, storageId } = useLocalSearchParams<{ warehouseId?: string; storageId?: string }>();

  // --- TOUR LOGIC ---
  useEffect(() => {
    if (loading || !isLayoutReady || warehouses.length === 0) return;
    
    const checkFirstTime = async () => {
        try {
            const hasSeen = await AsyncStorage.getItem('HAS_SEEN_ADD_ITEM_TOUR');
            if (!hasSeen) {
                setTimeout(() => {
                  startTour();
                }, 1000);
                await AsyncStorage.setItem('HAS_SEEN_ADD_ITEM_TOUR', 'true');
            }
        } catch (e) { 
          console.warn('Tour check error:', e); 
        }
    };
    checkFirstTime();
  }, [loading, isLayoutReady, warehouses]);

  // Fetch Data: Warehouses
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

  // Fetch Data: Storages
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

  // Fetch Data: Locations
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
   
  // Computed Data
  const shelfOptions = useMemo(() => {
      const shelves = [...new Set(allLocations.map(l => l.shelf))].sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
      return shelves.map(s => ({ label: s, value: s }));
  }, [allLocations]);

  const shelfLocations = useMemo(() => {
      if (!selectedShelf) return [];
      return allLocations
        .filter(l => l.shelf === selectedShelf)
        .sort((a, b) => {
            const rowDiff = (a.row || '').localeCompare(b.row || '', undefined, { numeric: true });
            if (rowDiff !== 0) return rowDiff;
            return (a.column || '').localeCompare(b.column || '', undefined, { numeric: true });
        });
  }, [allLocations, selectedShelf]);

  const toggleLocationSelection = (id: string) => {
      setSelectedLocationIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // --- MAIN ACTION ---
  const handleAddItem = async () => {
    // 1. Validation: Form Fields
    if (!name.trim() || !quantity || !restockThreshold || !selectedWarehouse || !selectedStorage) {
      showError(t('general.error'), t('general.fillFields'));
      return;
    }
    
    // 2. Validation: Location
    if (selectedLocationIds.length === 0) {
        showError(t('general.error'), "Please select at least one location slot.");
        return;
    }

    // 3. Validation: Auth Profile (Prevents the crash if profile is loading/null)
    if (!profile || !profile.workgroup_id) {
        showError(t('general.error'), "User profile not loaded. Please try again.");
        return;
    }

    setLoading(true);
    
    try {
      // 4. Prepare Promises
      const promises = selectedLocationIds.map(locId => {
          return supabase.rpc('add_new_item', {
            p_name: name.trim(),
            p_quantity: parseInt(quantity, 10) || 0, // Fallback to 0 if NaN
            p_restock_threshold: parseInt(restockThreshold, 10) || 0,
            p_warehouse_id: selectedWarehouse,
            p_storage_id: selectedStorage,
            p_location_id: locId,
            p_workgroup_id: profile.workgroup_id,
            // Ensure Barcode is NULL if empty string
            p_barcode: itemBarcode && itemBarcode.trim() !== '' ? itemBarcode.trim() : null,
          });
      });

      const results = await Promise.all(promises);

      // 5. Check Results
      const failures = results.filter(r => r.error);
      const successes = results.filter(r => !r.error);

      // Log for debugging
      if (failures.length > 0) {
          console.log("Add Item Failures:", failures.map(f => f.error));
      }

      if (successes.length === 0 && failures.length > 0) {
          // CASE: All Failed
          const msg = failures[0].error?.message || "Database Error";
          throw new Error(msg);
      } else if (successes.length > 0) {
          // CASE: Success (or Partial Success)
          const msg = successes.length === results.length 
            ? `Added item to ${successes.length} location(s).`
            : `Added to ${successes.length} locations. ${failures.length} failed.`;
          
          showSuccess(t('general.success'), msg);
          
          // Navigate back
          router.back();
      }
    } catch (error: any) {
      console.error("ADD ITEM ERROR:", error);
      showError(t('general.error'), error.message || "An unexpected error occurred");
      setLoading(false); 
    }
  };

  return (
    <ScrollView 
        style={{ flex: 1, backgroundColor: colors.background }} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        onLayout={() => setTimeout(() => setIsLayoutReady(true), 100)}
    >
      <View style={styles.header}>
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
          setSelectedLocationIds([]);
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
            setSelectedLocationIds([]);
          }}
        />
      )}

      <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('item.name')}</Text>
      <CopilotStep text="Enter a unique name for your item here." order={1} name="Item Name">
          <WalkableTextInput 
            collapsable={false}
            style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
            value={name} 
            onChangeText={setName} 
            placeholder="e.g. Copper Wire Spool"
            placeholderTextColor={colors.subtext}
          />
      </CopilotStep>

      <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('item.quantity')}</Text>
      <CopilotStep text="Set the initial quantity." order={2} name="Item Quantity">
        <WalkableTextInput
          collapsable={false}
          style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
          value={quantity} 
          onChangeText={setQuantity} 
          keyboardType="numeric"
          placeholder="e.g. 100"
          placeholderTextColor={colors.subtext}
        />
      </CopilotStep>

      <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('item.restockThreshold')}</Text>
      <CopilotStep text="Set a threshold for low stock alerts." order={3} name="Restock Alert">
        <WalkableTextInput
          collapsable={false}
          style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
          value={restockThreshold} 
          onChangeText={setRestockThreshold} 
          keyboardType="numeric"
          placeholder="e.g. 10"
          placeholderTextColor={colors.subtext}
        />
      </CopilotStep>

      {selectedStorage && shelfOptions.length > 0 && (
        <>
          <Text style={[typography.h2, styles.sectionHeader, { color: colors.text, borderBottomColor: colors.border }]}>
            {t('item.location')}
          </Text>
          
          <DropdownPicker
            label={t('location.shelf')}
            options={shelfOptions}
            selectedValue={selectedShelf}
            onValueChange={(value) => {
              setSelectedShelf(value);
              setSelectedLocationIds([]); 
            }}
          />

          {selectedShelf && (
            <CopilotStep text="Tap available slots to assign storage locations." order={4} name="Location Grid">
              <WalkableView style={styles.gridContainer} collapsable={false}>
                <View style={styles.gridControls}>
                  <Text style={[typography.caption, { color: colors.text }]}>Selected: {selectedLocationIds.length}</Text>
                </View>

                <View style={styles.slotsGrid}>
                  {shelfLocations.map((loc) => {
                    const isOccupied = loc.items && loc.items.length > 0;
                    const isSelected = selectedLocationIds.includes(loc.id);
                    return (
                      <Pressable
                        key={loc.id}
                        onPress={() => toggleLocationSelection(loc.id)}
                        disabled={isOccupied}
                        style={[
                          styles.slotButton,
                          { 
                            borderColor: colors.border,
                            backgroundColor: isOccupied ? 'rgba(128,128,128,0.1)' : isSelected ? colors.primary : colors.card 
                          }
                        ]}
                      >
                        <Text style={[styles.slotText, { color: isSelected ? '#FFF' : colors.text }]}>
                          {loc.row ? `${loc.row}-` : ''}{loc.column}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </WalkableView>
            </CopilotStep>
          )}
        </>
      )}
      
      <CopilotStep text="Save your item!" order={5} name="Save Item">
        <WalkablePressable
          collapsable={false}
          style={[styles.button, { backgroundColor: colors.primary, opacity: (loading || selectedLocationIds.length === 0) ? 0.6 : 1 }]} 
          onPress={handleAddItem} 
          disabled={loading || selectedLocationIds.length === 0}
        >
          {loading ? (
             <ActivityIndicator color="#fff" />
          ) : (
             <Text style={[typography.button, styles.buttonText, { color: '#fff' }]}>{t('item.addButton')}</Text>
          )}
        </WalkablePressable>
      </CopilotStep>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
    contentContainer: { padding: 20 },
    header: { alignItems: 'center', marginBottom: 20 },
    sectionHeader: { fontWeight: '600', marginTop: 20, marginBottom: 15, borderBottomWidth: 1, paddingBottom: 5 },
    label: { marginBottom: 8, fontWeight: '500' },
    input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 20 },
    button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    buttonText: { fontWeight: 'bold' },
    gridContainer: { marginTop: 10 },
    gridControls: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    slotButton: { width: 60, height: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 6 },
    slotText: { fontSize: 12, fontWeight: 'bold' },
});