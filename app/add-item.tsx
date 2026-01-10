import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Switch, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';
import { logActivity } from '../lib/logger';

// Helper for Finnish Tax Brackets
const TAX_BRACKETS = [
  { label: '25.5%', value: '25.5' },
  { label: '14%', value: '14' },
  { label: '10%', value: '10' },
  { label: '0%', value: '0' },
];

// Helper for sorting shelves/rows naturally (A, B, C... 1, 2, 10)
const naturalSort = (a: string | null, b: string | null) => {
    return (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' });
};

type LocationDef = {
    id: string;
    shelf: string;
    row: string;
    column: string;
    name?: string; 
};

export default function AddItemScreen() {
  const { t } = useTranslation();
  const { warehouseId, storageId, barcode } = useLocalSearchParams<{ warehouseId?: string; storageId?: string; barcode?: string }>();
  const { colors } = useTheme();
  const { profile, workgroup } = useAuth();
  const router = useRouter();

  // --- Original State ---
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [restockThreshold, setRestockThreshold] = useState('10');
  const [barcodeValue, setBarcodeValue] = useState(barcode || '');
  const [saving, setSaving] = useState(false);

  // --- Location Selection State ---
  const [availableLocations, setAvailableLocations] = useState<LocationDef[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // --- Financial State ---
  const [showFinancials, setShowFinancials] = useState(false);
  const [usageType, setUsageType] = useState<'production' | 'resale'>('production');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseTax, setPurchaseTax] = useState('25.5');
  const [salePrice, setSalePrice] = useState('');
  const [saleTax, setSaleTax] = useState('25.5');

  // --- Checks ---
  useEffect(() => {
    if (!warehouseId || !storageId) {
      router.replace('/select-location-modal');
    } else {
        fetchLocations();
    }
  }, [warehouseId, storageId]);

  // --- Fetch Locations Logic ---
  const fetchLocations = async () => {
      if(!storageId) return;
      setLoadingLocations(true);
      try {
          const { data, error } = await supabase
            .from('defined_locations')
            .select('id, shelf, row, column')
            .eq('storage_id', storageId);
          
          if(error) throw error;
          if(data) setAvailableLocations(data);
      } catch (err: any) {
          console.error('Error fetching locations:', err);
          // Optional: don't block user if locations fail, just log it
      } finally {
          setLoadingLocations(false);
      }
  };

  // --- Group Locations by Shelf for Display ---
  const groupedLocations = useMemo(() => {
      const groups: { [key: string]: LocationDef[] } = {};
      availableLocations.forEach(loc => {
          const shelf = loc.shelf || t('general.undefined', 'Other');
          if(!groups[shelf]) groups[shelf] = [];
          groups[shelf].push(loc);
      });
      return groups;
  }, [availableLocations, t]);

  // Sort keys for rendering (Shelf A, Shelf B...)
  const sortedShelves = Object.keys(groupedLocations).sort(naturalSort);

  const increment = () => setQuantity(prev => (parseInt(prev || '0', 10) + 1).toString());
  const decrement = () => setQuantity(prev => {
    const val = parseInt(prev || '0', 10);
    return val > 0 ? (val - 1).toString() : '0';
  });

  const handleSave = async () => {
    if (!name.trim()) {
      showError(t('general.error'), t('general.fillFields'));
      return;
    }

    if (!profile?.workgroup_id) {
      showError(t('general.error'), 'No active workgroup found.');
      return;
    }

    setSaving(true);
    try {
      const parseNum = (str: string) => str.trim() ? parseFloat(str.replace(',', '.')) : null;

      const newItem = {
        name: name.trim(),
        quantity: parseInt(quantity, 10),
        restock_threshold: parseInt(restockThreshold, 10),
        barcode: barcodeValue.trim() || null,
        storage_id: storageId,
        workgroup_id: profile.workgroup_id,
        
        // --- Added Location ID ---
        location_id: selectedLocationId || null, 

        // Financials
        usage_type: showFinancials ? usageType : 'production', 
        cost_per_unit: showFinancials ? parseNum(purchasePrice) : null,
        purchase_price: showFinancials ? parseNum(purchasePrice) : null,
        purchase_vat_percent: showFinancials ? parseNum(purchaseTax) : null,
        sale_price: (showFinancials && usageType === 'resale') ? parseNum(salePrice) : null,
        sale_vat_percent: (showFinancials && usageType === 'resale') ? parseNum(saleTax) : null,
      };

      const { data, error } = await supabase
        .from('items')
        .insert(newItem)
        .select()
        .single();

      if (error) throw error;

      if (workgroup?.id && data) {
        logActivity({
          workgroup_id: workgroup.id,
          item_id: data.id,
          item_name: data.name,
          action: 'ADD',
          change_amount: data.quantity,
          final_quantity: data.quantity
        });
      }

      showSuccess(t('general.success'), t('general.itemAdded'));
      router.back();
    } catch (error: any) {
      showError(t('general.error'), error.message);
    } finally {
      setSaving(false);
    }
  };

  const TaxSelector = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
    <View style={styles.taxRow}>
      {TAX_BRACKETS.map((bracket) => (
        <Pressable
          key={bracket.label}
          onPress={() => onChange(bracket.value)}
          style={[
            styles.taxChip,
            { 
              backgroundColor: value === bracket.value ? colors.primary : colors.card,
              borderColor: value === bracket.value ? colors.primary : colors.border
            }
          ]}
        >
          <Text style={[
            typography.caption, 
            { color: value === bracket.value ? '#fff' : colors.text, fontWeight: '600' }
          ]}>
            {bracket.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  if (!warehouseId || !storageId) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: colors.background }} size="large" color={colors.primary} />;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.contentContainer}>

        {/* --- Standard Fields --- */}
        <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.itemName*', 'Item Name')}</Text>
        <TextInput
          style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={name}
          onChangeText={setName}
          placeholder={t('item.itemNamePlaceholder', 'Enter item name')}
          placeholderTextColor={colors.subtext}
        />

        {/* --- Location Selector Grid (Restored) --- */}
        {sortedShelves.length > 0 && (
            <View style={{marginBottom: 20}}>
                 <Text style={[typography.h3, styles.label, { color: colors.text }]}>
                    {t('item.selectLocation', 'Select Grid Location (Optional)')}
                 </Text>
                 <View style={[styles.locationContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {loadingLocations ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : (
                        sortedShelves.map(shelf => (
                            <View key={shelf} style={styles.shelfGroup}>
                                <Text style={[typography.caption, { color: colors.subtext, marginBottom: 6 }]}>
                                    {t('item.shelf', 'Shelf')} {shelf}
                                </Text>
                                <View style={styles.gridRow}>
                                    {groupedLocations[shelf].sort((a,b) => naturalSort(a.row, b.row) || naturalSort(a.column, b.column)).map(loc => {
                                        const isSelected = selectedLocationId === loc.id;
                                        return (
                                            <TouchableOpacity
                                                key={loc.id}
                                                onPress={() => setSelectedLocationId(isSelected ? null : loc.id)}
                                                style={[
                                                    styles.gridChip,
                                                    { 
                                                        backgroundColor: isSelected ? colors.primary : colors.background,
                                                        borderColor: isSelected ? colors.primary : colors.border,
                                                    }
                                                ]}
                                            >
                                                <Text style={{ 
                                                    fontSize: 10, 
                                                    fontWeight: '600', 
                                                    color: isSelected ? '#fff' : colors.text 
                                                }}>
                                                    {loc.row}-{loc.column}
                                                </Text>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                            </View>
                        ))
                    )}
                 </View>
            </View>
        )}

        <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.quantity*', 'Quantity')}</Text>
        <View style={styles.stepperContainer}>
          <Pressable onPress={decrement} style={[styles.stepperButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FontAwesome name="minus" size={16} color={colors.text} />
          </Pressable>
          <TextInput
            style={[typography.h2, styles.qtyInput, { color: colors.text, backgroundColor: colors.background }]}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            textAlign="center"
          />
          <Pressable onPress={increment} style={[styles.stepperButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FontAwesome name="plus" size={16} color={colors.text} />
          </Pressable>
        </View>

        <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.restockThreshold*', 'Restock Threshold')}</Text>
        <TextInput
          style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={restockThreshold}
          onChangeText={setRestockThreshold}
          keyboardType="numeric"
          placeholder="10"
          placeholderTextColor={colors.subtext}
        />

        {/* --- Financial Toggle Section --- */}
        <View style={[styles.toggleHeader, { borderTopColor: colors.border, marginTop: 10 }]}>
            <Text style={[typography.h3, { color: colors.text }]}>
              {t('item.financialDetails', 'Financial & Tax Details')}
            </Text>
            <Switch 
              value={showFinancials} 
              onValueChange={setShowFinancials} 
              trackColor={{ false: colors.border, true: colors.primary }}
            />
        </View>

        {showFinancials && (
          <View style={[styles.financialContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            
            {/* Usage Type Selection */}
            <Text style={[typography.caption, styles.subLabel, { color: colors.subtext }]}>
                {t('item.usageType', 'Item Usage')}
            </Text>
            <View style={[styles.usageRow, { borderColor: colors.border }]}>
              <Pressable 
                style={[styles.usageBtn, usageType === 'production' && { backgroundColor: colors.primary }]}
                onPress={() => setUsageType('production')}
              >
                 <Text style={[typography.body, { color: usageType === 'production' ? '#fff' : colors.text }]}>
                   {t('item.production', 'Production')}
                 </Text>
              </Pressable>
              <Pressable 
                style={[styles.usageBtn, usageType === 'resale' && { backgroundColor: colors.primary }]}
                onPress={() => setUsageType('resale')}
              >
                 <Text style={[typography.body, { color: usageType === 'resale' ? '#fff' : colors.text }]}>
                   {t('item.resale', 'Resale')}
                 </Text>
              </Pressable>
            </View>

            {/* Purchase Price Input */}
            <Text style={[typography.h3, styles.label, { color: colors.text, marginTop: 12 }]}>
              {t('item.purchasePrice', 'Purchase Price (Net)')}
            </Text>
            <View style={styles.rowInputs}>
              <View style={{flex: 1, marginRight: 8}}>
                 <TextInput
                   style={[typography.body, styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                   value={purchasePrice}
                   onChangeText={setPurchasePrice}
                   keyboardType="decimal-pad"
                   placeholder={t('item.pricePlaceholder', '0.00')}
                   placeholderTextColor={colors.subtext}
                 />
              </View>
              <View style={{width: 80}}>
                 <TextInput
                   style={[typography.body, styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                   value={purchaseTax}
                   onChangeText={setPurchaseTax}
                   keyboardType="decimal-pad"
                   placeholder="%"
                   placeholderTextColor={colors.subtext}
                 />
              </View>
            </View>
            
            <Text style={[typography.caption, {color: colors.subtext, marginBottom: 8}]}>
               {t('item.purchaseTaxBracket', 'Purchase Tax %')}
            </Text>
            <TaxSelector value={purchaseTax} onChange={setPurchaseTax} />

            {/* Sales Price (Only if Resale) */}
            {usageType === 'resale' && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[typography.h3, styles.label, { color: colors.text }]}>
                   {t('item.salePrice', 'Sale Price (Net)')}
                </Text>
                <View style={styles.rowInputs}>
                  <View style={{flex: 1, marginRight: 8}}>
                      <TextInput
                        style={[typography.body, styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        value={salePrice}
                        onChangeText={setSalePrice}
                        keyboardType="decimal-pad"
                        placeholder={t('item.pricePlaceholder', '0.00')}
                        placeholderTextColor={colors.subtext}
                      />
                  </View>
                  <View style={{width: 80}}>
                      <TextInput
                        style={[typography.body, styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        value={saleTax}
                        onChangeText={setSaleTax}
                        keyboardType="decimal-pad"
                        placeholder="%"
                        placeholderTextColor={colors.subtext}
                      />
                  </View>
                </View>
                <Text style={[typography.caption, {color: colors.subtext, marginBottom: 8}]}>
                   {t('item.salesTaxBracket', 'Sales Tax %')}
                </Text>
                <TaxSelector value={saleTax} onChange={setSaleTax} />
              </>
            )}
          </View>
        )}

        {/* --- Barcode Field --- */}
        <Text style={[typography.h3, styles.label, { color: colors.text, marginTop: 10 }]}>{t('item.barcode', 'Barcode (Optional)')}</Text>
        <TextInput
          style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={barcodeValue}
          onChangeText={setBarcodeValue}
          keyboardType="numeric"
          placeholder={t('item.barcodePlaceholder', 'Enter barcode')}
          placeholderTextColor={colors.subtext}
        />

        <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[typography.button, styles.buttonText, { color: '#fff' }]}>
                {t('dashboard.addItem', 'Add Item')}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contentContainer: { padding: 24, paddingBottom: 50 },
  label: { marginBottom: 8, fontWeight: '500' },
  subLabel: { marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 16 },
  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  buttonText: { fontWeight: 'bold' },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  stepperButton: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 8 },
  qtyInput: { flex: 1, height: 50, textAlign: 'center', fontSize: 22, fontWeight: 'bold' },
  
  // Location Grid Styles
  locationContainer: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  shelfGroup: { marginBottom: 12 },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridChip: { 
      paddingVertical: 8, 
      paddingHorizontal: 8, 
      borderWidth: 1, 
      borderRadius: 6,
      minWidth: 40,
      alignItems: 'center',
      justifyContent: 'center'
  },

  // Financial Styles
  toggleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, marginBottom: 12, borderTopWidth: 1 },
  financialContainer: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  usageRow: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, marginBottom: 16 },
  usageBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  rowInputs: { flexDirection: 'row' },
  taxRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 16 },
  taxChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  divider: { height: 1, width: '100%', marginVertical: 16 },
});