import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Switch, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';
import { logActivity } from '../lib/logger';
import { DropdownPicker } from '../components/dropdownPicker'; // Imported your component

// Finnish Tax Brackets
const TAX_BRACKETS = [
  { label: '25.5%', value: '25.5' },
  { label: '14%', value: '14' },
  { label: '10%', value: '10' },
  { label: '0%', value: '0' },
];

export default function AddItemScreen() {
  const { t } = useTranslation();
  // These params come from SelectLocationModal
  const { warehouseId, storageId, barcode } = useLocalSearchParams<{ warehouseId?: string; storageId?: string; barcode?: string }>();
  const { colors } = useTheme();
  const { profile, workgroup } = useAuth();
  const router = useRouter();

  // --- ITEM FORM STATE ---
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(''); // String to allow empty state while typing
  const [restockThreshold, setRestockThreshold] = useState('10');
  const [barcodeValue, setBarcodeValue] = useState(barcode || '');

  // --- MULTI-LOCATION STATE ---
  // We store an array of location objects { id, name }
  const [targetLocations, setTargetLocations] = useState<{ id: string; name: string }[]>([]);
  
  // State for the "Add another location" section
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [warehouses, setWarehouses] = useState<{ label: string; value: string }[]>([]);
  const [storages, setStorages] = useState<{ label: string; value: string }[]>([]);
  const [tempWarehouseId, setTempWarehouseId] = useState<string | null>(null);
  const [tempStorageId, setTempStorageId] = useState<string | null>(null);

  // --- FINANCIAL STATE ---
  const [showFinancials, setShowFinancials] = useState(false);
  const [usageType, setUsageType] = useState<'production' | 'resale'>('production');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseTax, setPurchaseTax] = useState('25.5');
  const [salePrice, setSalePrice] = useState('');
  const [saleTax, setSaleTax] = useState('25.5');

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. INITIAL SETUP: Load the passed location & Warehouse list
  useEffect(() => {
    const initData = async () => {
      if (!storageId) {
        router.replace('/select-location-modal');
        return;
      }
      setLoading(true);

      // A. Fetch details of the initial passed storage
      const { data: initialStorage } = await supabase.from('storages').select('id, name').eq('id', storageId).single();
      if (initialStorage) {
        setTargetLocations([{ id: initialStorage.id, name: initialStorage.name }]);
      }

      // B. Fetch Warehouses (for the "Add more" feature)
      const { data: whData } = await supabase.from('warehouses').select('id, name');
      if (whData) {
        setWarehouses(whData.map(w => ({ label: w.name, value: w.id })));
      }

      setLoading(false);
    };
    initData();
  }, [storageId]);

  // 2. LISTEN: Fetch Storages when user selects a warehouse in "Add more" section
  useEffect(() => {
    if (!tempWarehouseId) {
      setStorages([]);
      return;
    }
    const fetchStorages = async () => {
      const { data } = await supabase.from('storages').select('id, name').eq('warehouse_id', tempWarehouseId);
      if (data) setStorages(data.map(s => ({ label: s.name, value: s.id })));
    };
    fetchStorages();
  }, [tempWarehouseId]);

  // --- HANDLERS ---

  const handleConfirmAddLocation = () => {
    if (!tempStorageId) return;
    
    // Check if already added
    if (targetLocations.some(loc => loc.id === tempStorageId)) {
      showError(t('general.error'), 'Location already added.');
      return;
    }

    // Find name for display
    const storageObj = storages.find(s => s.value === tempStorageId);
    if (storageObj) {
      setTargetLocations(prev => [...prev, { id: tempStorageId, name: storageObj.label }]);
    }

    // Reset temporary fields
    setIsAddingLocation(false);
    setTempWarehouseId(null);
    setTempStorageId(null);
  };

  const removeLocation = (idToRemove: string) => {
    if (targetLocations.length <= 1) {
      showError(t('general.error'), 'Must have at least one location.');
      return;
    }
    setTargetLocations(prev => prev.filter(loc => loc.id !== idToRemove));
  };

  const handleAddItem = async () => {
    // Validation
    if (!name.trim()) {
      showError(t('general.error'), t('general.fillFields'));
      return;
    }
    if (targetLocations.length === 0) {
      showError(t('general.error'), 'No location selected.');
      return;
    }

    setSaving(true);
    try {
      const parseNum = (str: string) => str.trim() ? parseFloat(str.replace(',', '.')) : null;
      const finalQty = quantity.trim() === '' ? 0 : parseInt(quantity, 10);

      // Prepare common data
      const baseItemData = {
        name: name.trim(),
        quantity: finalQty,
        restock_threshold: parseInt(restockThreshold, 10) || 0,
        barcode: barcodeValue.trim() || null,
        workgroup_id: profile?.workgroup_id,
        // Financials
        usage_type: showFinancials ? usageType : 'production',
        purchase_price: showFinancials ? parseNum(purchasePrice) : null,
        purchase_vat_percent: showFinancials ? parseNum(purchaseTax) : null,
        sale_price: (showFinancials && usageType === 'resale') ? parseNum(salePrice) : null,
        sale_vat_percent: (showFinancials && usageType === 'resale') ? parseNum(saleTax) : null,
      };

      // Loop through target locations and insert item for EACH
      const promises = targetLocations.map(async (loc) => {
        const { data, error } = await supabase
          .from('items')
          .insert({ ...baseItemData, storage_id: loc.id })
          .select()
          .single();

        if (error) throw error;

        // Log activity
        if (workgroup?.id && data) {
          await logActivity({
            workgroup_id: workgroup.id,
            item_id: data.id,
            item_name: data.name,
            action: 'ADD',
            change_amount: data.quantity,
            final_quantity: data.quantity
          });
        }
      });

      await Promise.all(promises);

      showSuccess(t('general.success'), t('general.itemAdded'));

      // RESET FORM (Clear specific fields so user can add next item immediately)
      setName('');
      setQuantity('');
      setBarcodeValue('');
      // Note: We keep Financials and Locations as they likely remain the same for a batch
      
    } catch (error: any) {
      showError(t('general.error'), error.message);
    } finally {
      setSaving(false);
    }
  };

  // Helper Tax Component
  const TaxSelector = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
    <View style={styles.taxRow}>
      {TAX_BRACKETS.map((bracket) => (
        <Pressable
          key={bracket.label}
          onPress={() => onChange(bracket.value)}
          style={[styles.taxChip, { 
              backgroundColor: value === bracket.value ? colors.primary : colors.card,
              borderColor: value === bracket.value ? colors.primary : colors.border
          }]}
        >
          <Text style={[typography.caption, { color: value === bracket.value ? '#fff' : colors.text }]}>{bracket.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  if (loading) return <ActivityIndicator style={{ flex: 1, backgroundColor: colors.background }} size="large" color={colors.primary} />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">

        {/* 1. Name */}
        <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.itemName*')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={name}
          onChangeText={setName}
          placeholder={t('item.itemNamePlaceholder', 'Enter item name')}
          placeholderTextColor={colors.subtext}
          autoFocus={false}
        />

        {/* 2. Quantity - Typeable Input + Helpers */}
        <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.quantity*')}</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {/* Helper Minus */}
          <Pressable 
            onPress={() => {
               const curr = parseInt(quantity || '0');
               if(curr > 0) setQuantity((curr - 1).toString());
            }} 
            style={[styles.miniBtn, {backgroundColor: colors.card, borderColor: colors.border}]}
          >
             <FontAwesome name="minus" size={16} color={colors.text} />
          </Pressable>

          {/* Typeable Input */}
          <TextInput
            style={[styles.input, { flex: 1, textAlign:'center', backgroundColor: colors.card, color: colors.text, borderColor: colors.border, marginBottom: 0 }]}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.subtext}
          />

          {/* Helper Plus */}
          <Pressable 
            onPress={() => setQuantity(p => (parseInt(p||'0') + 1).toString())} 
            style={[styles.miniBtn, {backgroundColor: colors.card, borderColor: colors.border}]}
          >
             <FontAwesome name="plus" size={16} color={colors.text} />
          </Pressable>
        </View>

        {/* 3. Multi-Location Selection */}
        <Text style={[typography.h3, styles.label, { color: colors.text }]}>Target Locations</Text>
        <View style={[styles.locationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            
            {/* List of selected locations */}
            <View style={{flexDirection:'row', flexWrap:'wrap', gap: 8, marginBottom: 10}}>
               {targetLocations.map(loc => (
                 <View key={loc.id} style={[styles.locChip, { backgroundColor: colors.primary }]}>
                    <Text style={{color:'#fff', fontWeight:'bold', fontSize:12, marginRight: 6}}>{loc.name}</Text>
                    {targetLocations.length > 1 && (
                      <TouchableOpacity onPress={() => removeLocation(loc.id)}>
                        <Ionicons name="close-circle" size={16} color="#fff" />
                      </TouchableOpacity>
                    )}
                 </View>
               ))}
            </View>

            {/* "Add Another" Button or Form */}
            {!isAddingLocation ? (
              <Pressable onPress={() => setIsAddingLocation(true)} style={{flexDirection:'row', alignItems:'center', paddingVertical:4}}>
                 <FontAwesome name="plus-circle" size={16} color={colors.success} />
                 <Text style={{color: colors.success, fontWeight:'bold', marginLeft: 6}}>Add another location</Text>
              </Pressable>
            ) : (
              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                 <Text style={[typography.caption, { color: colors.text, marginBottom: 4 }]}>Add Location:</Text>
                 <DropdownPicker
                    label={t('warehouse.title')}
                    placeholder="Select Warehouse"
                    options={warehouses}
                    selectedValue={tempWarehouseId}
                    onValueChange={(val) => { setTempWarehouseId(val); setTempStorageId(null); }}
                    zIndex={3000} // Ensure dropdown floats on top
                 />
                 {tempWarehouseId && (
                   <View style={{marginTop: 8}}>
                     <DropdownPicker
                        label={t('storage.title')}
                        placeholder="Select Storage"
                        options={storages}
                        selectedValue={tempStorageId}
                        onValueChange={setTempStorageId}
                        zIndex={2000}
                     />
                   </View>
                 )}
                 <View style={{flexDirection:'row', justifyContent:'flex-end', marginTop: 12, gap: 10}}>
                    <Pressable onPress={() => setIsAddingLocation(false)}>
                       <Text style={{color: colors.subtext, padding: 8}}>Cancel</Text>
                    </Pressable>
                    <Pressable 
                       onPress={handleConfirmAddLocation} 
                       style={{backgroundColor: colors.success, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6}}
                       disabled={!tempStorageId}
                    >
                       <Text style={{color: '#fff', fontWeight:'bold'}}>Add</Text>
                    </Pressable>
                 </View>
              </View>
            )}
        </View>

        {/* 4. Financial Details */}
        <View style={[styles.toggleHeader, { borderTopColor: colors.border }]}>
           <Text style={[typography.h3, { color: colors.text }]}>{t('item.financialDetails', 'Financial & Tax Details')}</Text>
           <Switch value={showFinancials} onValueChange={setShowFinancials} trackColor={{ false: colors.border, true: colors.primary }} />
        </View>

        {showFinancials && (
          <View style={[styles.financialContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
             {/* Usage */}
             <Text style={[typography.caption, styles.subLabel, { color: colors.subtext }]}>{t('item.usageType', 'Item Usage')}</Text>
             <View style={styles.usageRow}>
               <Pressable onPress={() => setUsageType('production')} style={[styles.usageBtn, usageType === 'production' && { backgroundColor: colors.primary }]}>
                  <Text style={[typography.body, { color: usageType === 'production' ? '#fff' : colors.text }]}>{t('item.production', 'Production')}</Text>
               </Pressable>
               <Pressable onPress={() => setUsageType('resale')} style={[styles.usageBtn, usageType === 'resale' && { backgroundColor: colors.primary }]}>
                  <Text style={[typography.body, { color: usageType === 'resale' ? '#fff' : colors.text }]}>{t('item.resale', 'Resale')}</Text>
               </Pressable>
             </View>

             {/* Purchase */}
             <Text style={[typography.h3, styles.label, { color: colors.text, marginTop: 12 }]}>{t('item.purchasePrice', 'Purchase Price')}</Text>
             <View style={styles.rowInputs}>
               <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border, marginBottom: 0 }]} 
                  value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.subtext} />
               <TextInput style={[styles.input, { width: 80, marginLeft: 8, backgroundColor: colors.background, color: colors.text, borderColor: colors.border, marginBottom: 0 }]} 
                  value={purchaseTax} onChangeText={setPurchaseTax} keyboardType="decimal-pad" placeholder="%" placeholderTextColor={colors.subtext} />
             </View>
             <TaxSelector value={purchaseTax} onChange={setPurchaseTax} />

             {/* Sales */}
             {usageType === 'resale' && (
               <>
                 <View style={[styles.divider, { backgroundColor: colors.border }]} />
                 <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.salePrice', 'Sale Price')}</Text>
                 <View style={styles.rowInputs}>
                   <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border, marginBottom: 0 }]} 
                      value={salePrice} onChangeText={setSalePrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.subtext} />
                   <TextInput style={[styles.input, { width: 80, marginLeft: 8, backgroundColor: colors.background, color: colors.text, borderColor: colors.border, marginBottom: 0 }]} 
                      value={saleTax} onChangeText={setSaleTax} keyboardType="decimal-pad" placeholder="%" placeholderTextColor={colors.subtext} />
                 </View>
                 <TaxSelector value={saleTax} onChange={setSaleTax} />
               </>
             )}
          </View>
        )}

        {/* 5. Threshold & Barcode */}
        <Text style={[typography.h3, styles.label, { color: colors.text, marginTop: 16 }]}>{t('item.restockThreshold*')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={restockThreshold}
          onChangeText={setRestockThreshold}
          keyboardType="numeric"
          placeholder="10"
        />

        <Text style={[typography.h3, styles.label, { color: colors.text, marginTop: 8 }]}>{t('item.barcode', 'Barcode')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={barcodeValue}
          onChangeText={setBarcodeValue}
          keyboardType="numeric"
          placeholder={t('item.barcodePlaceholder')}
          placeholderTextColor={colors.subtext}
        />

        {/* 6. MAIN ACTION BUTTON */}
        <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleAddItem} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : 
            <View style={{flexDirection:'row', alignItems:'center'}}>
               <FontAwesome name="plus" size={16} color="#fff" style={{marginRight:8}}/>
               <Text style={[typography.button, styles.buttonText, { color: '#fff' }]}>
                 {t('general.addItem', 'Add Item')}
               </Text>
            </View>
          }
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contentContainer: { padding: 24, paddingBottom: 50 },
  label: { marginBottom: 8, fontWeight: '500' },
  subLabel: { marginBottom: 4, fontWeight: '600', fontSize: 12 },
  
  // Standardized Input Style
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, height: 50, fontSize: 16, marginBottom: 16 },
  
  // Mini Helper Button
  miniBtn: { width: 50, height: 50, justifyContent:'center', alignItems:'center', borderWidth:1, borderRadius:8 },

  button: { padding: 16, borderRadius: 8, alignItems: 'center', justifyContent:'center', marginTop: 30 },
  buttonText: { fontWeight: 'bold', fontSize: 18 },

  // Location Styles
  locationCard: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  locChip: { flexDirection:'row', alignItems:'center', paddingHorizontal:10, paddingVertical:8, borderRadius:6 },

  // Financial Layout
  toggleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, marginBottom: 12, borderTopWidth: 1 },
  financialContainer: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  usageRow: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#ccc', marginBottom: 16 },
  usageBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  rowInputs: { flexDirection: 'row', marginBottom: 8 },
  taxRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  taxChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  divider: { height: 1, width: '100%', marginVertical: 16 },
});