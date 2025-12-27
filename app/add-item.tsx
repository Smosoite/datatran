import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import { DropdownPicker } from '../components/dropdownPicker';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
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
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  const { warehouseId, storageId } = useLocalSearchParams<{ warehouseId?: string; storageId?: string }>();

  // --- START TOUR ON MOUNT (ONCE) ---
  useEffect(() => {
    const checkFirstTime = async () => {
        try {
            const hasSeen = await AsyncStorage.getItem('HAS_SEEN_ADD_ITEM_TOUR');
            if (!hasSeen) {
                setTimeout(() => startTour(), 1500);
                await AsyncStorage.setItem('HAS_SEEN_ADD_ITEM_TOUR', 'true');
            }
        } catch (e) {
            console.warn("Tour check failed", e);
        }
    };
    checkFirstTime();
  }, []);

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

  // --- Handlers ---

  const toggleLocationSelection = (id: string) => {
      setSelectedLocationIds(prev => {
          if (prev.includes(id)) {
              return prev.filter(x => x !== id);
          } else {
              return [...prev, id];
          }
      });
  };

  const selectAllOnShelf = () => {
      const availableIds = shelfLocations
        .filter(l => !l.items || l.items.length === 0) 
        .map(l => l.id);
      setSelectedLocationIds(availableIds);
  };

  const clearSelection = () => {
      setSelectedLocationIds([]);
  };
   
  const handleAddItem = async () => {
    if (!name.trim() || !quantity || !restockThreshold || !selectedWarehouse || !selectedStorage) {
      showError(t('general.error'), t('general.fillFields'));
      return;
    }

    if (selectedLocationIds.length === 0) {
        showError(t('general.error'), "Please select at least one location slot.");
        return;
    }

    setLoading(true);
    try {
      const promises = selectedLocationIds.map(locId => {
          return supabase.rpc('add_new_item', {
            p_name: name.trim(),
            p_quantity: parseInt(quantity, 10), 
            p_restock_threshold: parseInt(restockThreshold, 10),
            p_warehouse_id: selectedWarehouse,
            p_storage_id: selectedStorage,
            p_location_id: locId,
            p_workgroup_id: profile.workgroup_id,
            p_barcode: itemBarcode,
          });
      });

      const results = await Promise.all(promises);

      const failed = results.filter(r => r.error);
      if (failed.length > 0) {
          console.error(failed);
          throw new Error(`Failed to add items to ${failed.length} locations.`);
      }
       
      showSuccess(t('general.success'), `Added item to ${selectedLocationIds.length} location(s).`);

      setName('');
      setQuantity('');
      setRestockThreshold('');
      setItemBarcode(null);
      setSelectedLocationIds([]);

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
      
      {/* 1. Name Input Tour Step */}
      <CopilotStep text="Enter a unique name for your item here." order={1} name="itemName">
          <WalkableTextInput 
            style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
            value={name} 
            onChangeText={setName} 
            placeholder="e.g. Copper Wire Spool"
            placeholderTextColor={colors.subtext}
          />
      </CopilotStep>

      <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('item.quantity')}</Text>
      <TextInput 
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
        value={quantity} 
        onChangeText={setQuantity} 
        keyboardType="numeric" 
        placeholder="Qty per location"
        placeholderTextColor={colors.subtext}
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
              setSelectedLocationIds([]); 
            }}
          />

            {/* --- MULTI-SELECT GRID --- */}
            {selectedShelf && (
                <View style={styles.gridContainer}>
                    <View style={styles.gridControls}>
                        <Text style={[typography.caption, { color: colors.text }]}>
                            Selected: {selectedLocationIds.length}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Pressable onPress={selectAllOnShelf}>
                                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>Select All Empty</Text>
                            </Pressable>
                            <Pressable onPress={clearSelection}>
                                <Text style={{ color: colors.danger, fontSize: 12, fontWeight: 'bold' }}>Clear</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* 2. Grid Tour Step */}
                    <CopilotStep text="Tap available slots to place your item. You can select multiple!" order={2} name="gridSelection">
                        <WalkableView style={styles.slotsGrid} collapsable={false}>
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
                                                borderColor: colors.selector,
                                                backgroundColor: isOccupied 
                                                    ? 'rgba(128,128,128,0.1)' 
                                                    : isSelected 
                                                        ? colors.primary 
                                                        : colors.card 
                                            }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.slotText, 
                                            { 
                                                color: isOccupied 
                                                    ? colors.subtext 
                                                    : isSelected 
                                                        ? '#FFF' 
                                                        : colors.text 
                                            }
                                        ]}>
                                            {loc.row ? `${loc.row}-` : ''}{loc.column}
                                        </Text>
                                        {isOccupied && (
                                            <MaterialCommunityIcons 
                                                name="lock" 
                                                size={10} 
                                                color={colors.subtext} 
                                                style={{ position: 'absolute', top: 2, right: 2 }}
                                            />
                                        )}
                                    </Pressable>
                                );
                            })}
                            {shelfLocations.length === 0 && (
                                <Text style={{ color: colors.subtext, fontStyle: 'italic' }}>No slots defined for this shelf.</Text>
                            )}
                        </WalkableView>
                    </CopilotStep>
                </View>
            )}
        </>
      )}
       
      <Pressable 
        style={[styles.button, { backgroundColor: colors.selector, opacity: (loading || selectedLocationIds.length === 0) ? 0.6 : 1 }]} 
        onPress={handleAddItem} 
        disabled={loading || selectedLocationIds.length === 0}
      >
        {loading ? (
          <ActivityIndicator color={colors.text || '#fff'} />
        ) : (
          <Text style={[typography.button, styles.buttonText, { color: colors.text || '#fff' }]}>
              {selectedLocationIds.length > 1 
                ? `${t('item.addButton')} to (${selectedLocationIds.length}) locations`
                : t('item.addButton')
              }
          </Text>
        )}
      </Pressable>

       <Pressable 
        style={[styles.button, { backgroundColor: 'transparent', marginTop: 10, borderWidth: 1, borderColor: colors.selector }]} 
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
    
    // Grid Styles
    gridContainer: { marginTop: 10 },
    gridControls: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    slotButton: {
        width: 60,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 6,
    },
    slotText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
});