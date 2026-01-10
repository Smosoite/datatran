import '../i18n';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  ActivityIndicator, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase'; // Adjust path if needed
import { useTheme } from '../../providers/ThemeProvider'; // Adjust path if needed
import { showError, showSuccess } from '../../lib/toast'; // Adjust path if needed
import { typography } from '../../styles/typography'; // Adjust path if needed

// --- Types ---
type Warehouse = {
  id: string;
  name: string;
};

type Storage = {
  id: string;
  name: string;
  warehouse_id: string;
};

type DefinedLocation = {
  id: string;
  shelf: string;
  row: string | null;
  column: string | null;
  container: string | null;
  items: { name: string }[] | null; // To check if occupied
};

export default function AddItemScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  // --- Form State ---
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  // --- Selection State ---
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [storages, setStorages] = useState<Storage[]>([]);
  const [locations, setLocations] = useState<DefinedLocation[]>([]);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [selectedStorageId, setSelectedStorageId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  const [loadingData, setLoadingData] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // --- Fetch Warehouses on Mount ---
  useEffect(() => {
    fetchWarehouses();
  }, []);

  // --- Fetch Storages when Warehouse Changes ---
  useEffect(() => {
    if (selectedWarehouseId) {
      fetchStorages(selectedWarehouseId);
    } else {
      setStorages([]);
      setSelectedStorageId(null);
    }
  }, [selectedWarehouseId]);

  // --- Fetch Locations when Storage Changes ---
  useEffect(() => {
    if (selectedStorageId) {
      fetchLocations(selectedStorageId);
    } else {
      setLocations([]);
      setSelectedLocationId(null);
    }
  }, [selectedStorageId]);

  // --- Data Fetching Logic ---
  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase.from('warehouses').select('id, name').order('name');
      if (error) throw error;
      setWarehouses(data || []);
    } catch (err: any) {
      showError(t('general.errorFetchLocal'));
    }
  };

  const fetchStorages = async (warehouseId: string) => {
    try {
      const { data, error } = await supabase
        .from('storages')
        .select('id, name, warehouse_id')
        .eq('warehouse_id', warehouseId)
        .order('name');
      if (error) throw error;
      setStorages(data || []);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const fetchLocations = async (storageId: string) => {
    setLoadingLocations(true);
    try {
      const { data, error } = await supabase
        .from('defined_locations')
        .select(`*, items ( name )`)
        .eq('storage_id', storageId)
        .order('shelf', { ascending: true })
        .order('row', { ascending: true });
      
      if (error) throw error;
      setLocations(data || []);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoadingLocations(false);
    }
  };

  // --- Helper: Format Location Name ---
  const formatLocationName = (loc: DefinedLocation) => {
    return [loc.shelf, loc.row, loc.column, loc.container].filter(Boolean).join(' - ');
  };

  // --- Submit Handler ---
  const handleAddItem = async () => {
    if (!name.trim()) {
      showError(t('item.nameRequired'));
      return;
    }
    if (!selectedLocationId) {
      showError(t('location.selectionRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('items').insert({
        name,
        description,
        quantity: parseInt(quantity) || 1,
        defined_location_id: selectedLocationId,
        // Assuming 'storage_id' might be needed on item, otherwise remove next line
        storage_id: selectedStorageId 
      });

      if (error) throw error;

      showSuccess(t('item.addSuccess'));
      router.back();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Stack.Screen options={{ title: t('item.addTitle') }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* --- 1. Item Details Section --- */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 12 }]}>{t('item.details')}</Text>
          
          <Text style={[typography.caption, { color: colors.subtext, marginBottom: 4 }]}>{t('item.name')}</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder={t('item.namePlaceholder')}
            placeholderTextColor={colors.subtext}
            value={name}
            onChangeText={setName}
          />

          <Text style={[typography.caption, { color: colors.subtext, marginBottom: 4, marginTop: 12 }]}>{t('item.description')}</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder={t('item.descPlaceholder')}
            placeholderTextColor={colors.subtext}
            value={description}
            onChangeText={setDescription}
          />

          <Text style={[typography.caption, { color: colors.subtext, marginBottom: 4, marginTop: 12 }]}>{t('item.quantity')}</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={quantity}
            keyboardType="numeric"
            onChangeText={setQuantity}
          />
        </View>

        {/* --- 2. Warehouse & Storage Selection --- */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 12 }]}>{t('location.context')}</Text>
          
          {/* Warehouse Selector (Simple Horizontal List) */}
          <Text style={[typography.caption, { color: colors.subtext, marginBottom: 8 }]}>{t('warehouse.select')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelect}>
            {warehouses.map(wh => (
              <Pressable
                key={wh.id}
                onPress={() => {
                  setSelectedWarehouseId(wh.id);
                  setSelectedStorageId(null); // Reset child
                }}
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: selectedWarehouseId === wh.id ? colors.primary : colors.background }
                ]}
              >
                <Text style={{ color: selectedWarehouseId === wh.id ? '#fff' : colors.text, fontWeight: '500' }}>
                  {wh.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Storage Selector (Visible only after Warehouse selected) */}
          {selectedWarehouseId && (
            <>
              <Text style={[typography.caption, { color: colors.subtext, marginBottom: 8, marginTop: 12 }]}>{t('storage.select')}</Text>
              {storages.length === 0 ? (
                <Text style={{ color: colors.subtext, fontStyle: 'italic' }}>{t('storage.noneFound')}</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelect}>
                  {storages.map(st => (
                    <Pressable
                      key={st.id}
                      onPress={() => setSelectedStorageId(st.id)}
                      style={[
                        styles.chip,
                        { borderColor: colors.border, backgroundColor: selectedStorageId === st.id ? colors.primary : colors.background }
                      ]}
                    >
                      <Text style={{ color: selectedStorageId === st.id ? '#fff' : colors.text, fontWeight: '500' }}>
                        {st.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </>
          )}
        </View>

        {/* --- 3. Locations Array (The requested "Last Choice") --- */}
        {selectedStorageId && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 20 }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: 12 }]}>{t('location.selectSpecific')}</Text>
            
            {loadingLocations ? (
              <ActivityIndicator color={colors.primary} />
            ) : locations.length === 0 ? (
              <Text style={{ color: colors.subtext, textAlign: 'center', padding: 10 }}>{t('location.noLocationsDefined')}</Text>
            ) : (
              <View style={styles.gridContainer}>
                {locations.map((loc) => {
                  const isSelected = selectedLocationId === loc.id;
                  const isOccupied = loc.items && loc.items.length > 0;

                  return (
                    <Pressable
                      key={loc.id}
                      onPress={() => setSelectedLocationId(loc.id)}
                      style={[
                        styles.locationItem,
                        { 
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor: isSelected ? colors.primary : colors.border
                        }
                      ]}
                    >
                      <View style={styles.locationHeader}>
                        <Text style={[
                          typography.body, 
                          { fontWeight: '600', color: isSelected ? '#fff' : colors.text }
                        ]}>
                          {formatLocationName(loc)}
                        </Text>
                        {isSelected && <FontAwesome name="check-circle" size={16} color="#fff" />}
                      </View>
                      
                      {/* Occupancy Indicator */}
                      {isOccupied ? (
                        <Text style={[
                          typography.caption, 
                          { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.danger, marginTop: 4 }
                        ]}>
                           <FontAwesome name="cube" /> {loc.items![0].name}
                        </Text>
                      ) : (
                         <Text style={[
                          typography.caption, 
                          { color: isSelected ? 'rgba(255,255,255,0.7)' : colors.success, marginTop: 4 }
                        ]}>
                           {t('general.empty')}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* --- Footer Button --- */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Pressable 
          style={[styles.submitButton, { backgroundColor: submitting ? colors.border : colors.primary }]}
          onPress={handleAddItem}
          disabled={submitting}
        >
          {submitting ? (
             <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[typography.h3, { color: '#fff' }]}>{t('item.addBtn')}</Text>
          )}
        </Pressable>
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  section: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
  },
  horizontalSelect: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  
  // Grid/List for Locations
  gridContainer: {
    flexDirection: 'column', // Stack vertically as requested
    gap: 8,
  },
  locationItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});