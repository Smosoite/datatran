import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useTheme } from '../../providers/ThemeProvider';
import { showError, showSuccess } from '../../lib/toast';
import { typography } from '../../styles/typography';
import { FontAwesome } from '@expo/vector-icons';

export default function OnboardingAddFirstItem() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();

  // State
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('10'); // Pre-fill for easier onboarding
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Selection State
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [storageId, setStorageId] = useState<string | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  // 1. Auto-Fetch Context
  useEffect(() => {
    const init = async () => {
      if (!profile?.workgroup_id) return;
      
      // Get Warehouse
      const { data: wh } = await supabase.from('warehouses').select('id').eq('workgroup_id', profile.workgroup_id).limit(1).single();
      if (wh) setWarehouseId(wh.id);

      // Get Storage
      const { data: st } = await supabase.from('storages').select('id').eq('workgroup_id', profile.workgroup_id).limit(1).single();
      if (st) {
        setStorageId(st.id);
        // Get Locations for this storage
        const { data: locs } = await supabase.from('defined_locations').select('id, shelf, row, column, items(id)').eq('storage_id', st.id);
        if (locs) setLocations(locs);
      }
      setDataLoading(false);
    };
    init();
  }, [profile]);

  const handleAddItem = async () => {
    if (!name.trim()) return showError(t('general.error'), "Please name your item.");
    if (selectedLocationIds.length === 0) return showError(t('general.error'), "Please tap a green slot to place the item.");

    setLoading(true);
    try {
      const promises = selectedLocationIds.map(locId => {
          return supabase.rpc('add_new_item', {
            p_name: name.trim(),
            p_quantity: parseInt(quantity, 10),
            p_restock_threshold: 5,
            p_warehouse_id: warehouseId,
            p_storage_id: storageId,
            p_location_id: locId,
            p_workgroup_id: profile.workgroup_id,
            p_barcode: null,
          });
      });
      
      const results = await Promise.all(promises);
      if (results.some(r => r.error)) throw new Error("Failed to add items.");
      
      showSuccess(t('general.success'), "First item added successfully!");
      router.push('/onboarding/completion');

    } catch (error: any) {
      showError(t('general.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleLocation = (id: string) => {
    if (selectedLocationIds.includes(id)) {
        setSelectedLocationIds(prev => prev.filter(x => x !== id));
    } else {
        setSelectedLocationIds([id]); // Single selection for simple onboarding
    }
  };

  // Group locations by shelf for rendering
  const shelves = useMemo(() => {
      const groups: any = {};
      locations.forEach(l => {
          if (!groups[l.shelf]) groups[l.shelf] = [];
          groups[l.shelf].push(l);
      });
      return Object.keys(groups).sort().map(k => ({ id: k, slots: groups[k] }));
  }, [locations]);

  if (dataLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      <View style={styles.header}>
        <Text style={[typography.h1, styles.title, { color: colors.text }]}>
          {t('onboarding.addItem', 'Add Your First Item')}
        </Text>
        <Text style={[typography.body, styles.subtitle, { color: colors.subtext }]}>
          Give it a name and tell us where it goes.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Form */}
        <View style={styles.formGroup}>
            <Text style={[typography.caption, { color: colors.text, marginBottom: 8 }]}>ITEM NAME</Text>
            <TextInput 
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Copper Wire"
                placeholderTextColor={colors.subtext}
                value={name}
                onChangeText={setName}
            />
        </View>

        <View style={styles.formGroup}>
            <Text style={[typography.caption, { color: colors.text, marginBottom: 8 }]}>QUANTITY</Text>
            <TextInput 
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
            />
        </View>

        {/* Location Selector */}
        <Text style={[typography.h3, { color: colors.text, marginTop: 20, marginBottom: 10 }]}>Select Location</Text>
        
        {shelves.length === 0 && (
             <Text style={{color: colors.danger}}>No locations found. Did you save the grid setup?</Text>
        )}

        <View style={styles.gridContainer}>
            {shelves.map(shelf => (
                <View key={shelf.id} style={{marginBottom: 10}}>
                    <Text style={{color: colors.subtext, fontSize: 12, marginBottom: 4}}>Shelf {shelf.id}</Text>
                    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
                        {shelf.slots.map((slot: any) => {
                            const isSelected = selectedLocationIds.includes(slot.id);
                            const isOccupied = slot.items && slot.items.length > 0;
                            return (
                                <Pressable 
                                    key={slot.id}
                                    onPress={() => toggleLocation(slot.id)}
                                    disabled={isOccupied}
                                    style={[
                                        styles.slot, 
                                        { 
                                            backgroundColor: isSelected ? colors.primary : isOccupied ? colors.border : colors.card,
                                            borderColor: colors.border 
                                        }
                                    ]}
                                >
                                    <Text style={{ fontSize: 10, color: isSelected ? '#fff' : colors.text }}>
                                        {slot.row}-{slot.column}
                                    </Text>
                                </Pressable>
                            )
                        })}
                    </View>
                </View>
            ))}
        </View>

      </ScrollView>

      <View style={styles.footer}>
         <Pressable 
            style={[styles.button, { backgroundColor: colors.primary, opacity: (!name || selectedLocationIds.length === 0) ? 0.5 : 1 }]}
            onPress={handleAddItem}
            disabled={loading || !name || selectedLocationIds.length === 0}
         >
            {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                    <Text style={[typography.button, { color: colors.primaryText }]}>Create Item</Text>
                    <FontAwesome name="check" size={16} color={colors.primaryText} style={{marginLeft: 8}} />
                </>
            )}
         </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20 },
  title: { textAlign: 'center', marginBottom: 8 },
  subtitle: { textAlign: 'center' },
  content: { paddingHorizontal: 24, paddingBottom: 100 },
  formGroup: { marginBottom: 16 },
  input: { padding: 16, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  gridContainer: { marginTop: 10 },
  slot: { width: 40, height: 30, borderRadius: 6, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  footer: { position: 'absolute', bottom: 30, left: 24, right: 24 },
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12 }
});