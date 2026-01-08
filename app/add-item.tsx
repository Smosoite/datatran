import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';
import { logActivity } from '../lib/logger';

// Helper for Finnish Tax Brackets (Current rates as of late 2025/2026)
const TAX_BRACKETS = [
  { label: '25.5%', value: '25.5' }, // General
  { label: '14%', value: '14' },     // Food/Restaurant
  { label: '10%', value: '10' },     // Books/Meds
  { label: '0%', value: '0' },
];

export default function AddItemScreen() {
  const { t } = useTranslation();
  const { warehouseId, storageId, barcode } = useLocalSearchParams<{ warehouseId?: string; storageId?: string; barcode?: string }>();
  const { colors } = useTheme();
  const { profile, workgroup } = useAuth();
  const router = useRouter();

  // Basic Info
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [restockThreshold, setRestockThreshold] = useState('10');
  const [barcodeValue, setBarcodeValue] = useState(barcode || '');
  
  // Financial & Tax Info
  const [showFinancials, setShowFinancials] = useState(false);
  const [usageType, setUsageType] = useState<'production' | 'resale'>('production');
  
  // Costs (Input as string to handle decimals gracefully)
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseTax, setPurchaseTax] = useState('25.5');
  
  // Sales (Only relevant if usageType === 'resale')
  const [salePrice, setSalePrice] = useState('');
  const [saleTax, setSaleTax] = useState('25.5');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!warehouseId || !storageId) {
      router.replace('/select-location-modal');
    }
  }, [warehouseId, storageId]);

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

    setSaving(true);
    try {
      // Helper to parse floats safely
      const parseNum = (str: string) => str.trim() ? parseFloat(str.replace(',', '.')) : null;

      const newItem = {
        name: name.trim(),
        quantity: parseInt(quantity, 10),
        restock_threshold: parseInt(restockThreshold, 10),
        barcode: barcodeValue.trim() || null,
        storage_id: storageId,
        workgroup_id: profile.workgroup_id,
        
        // New Financial Fields
        usage_type: showFinancials ? usageType : 'production', // Default to production if not specified
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

  // Reusable component for Tax Bracket Buttons
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

  if (!warehouseId || !storageId) return <ActivityIndicator style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.contentContainer}>

        {/* --- EXISTING FIELDS --- */}
        <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.itemName*')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={name}
          onChangeText={setName}
          placeholder={t('item.itemNamePlaceholder', 'Enter item name')}
          placeholderTextColor={colors.subtext}
        />

        <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.quantity*')}</Text>
        <View style={styles.stepperContainer}>
          <Pressable onPress={decrement} style={[styles.stepperButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FontAwesome name="minus" size={16} color={colors.text} />
          </Pressable>
          <TextInput
            style={[styles.qtyInput, { color: colors.text }]}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            textAlign="center"
          />
          <Pressable onPress={increment} style={[styles.stepperButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FontAwesome name="plus" size={16} color={colors.text} />
          </Pressable>
        </View>
        
        {/* --- TOGGLE FOR FINANCIALS --- */}
        <View style={[styles.toggleHeader, { borderTopColor: colors.border }]}>
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
            
            {/* 1. Usage Type */}
            <Text style={[typography.caption, styles.subLabel, { color: colors.subtext }]}>
                {t('item.usageType', 'Item Usage')}
            </Text>
            <View style={styles.usageRow}>
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

            {/* 2. Purchase Cost */}
            <Text style={[typography.h3, styles.label, { color: colors.text, marginTop: 16 }]}>
              {t('item.purchasePrice', 'Purchase Price (Net)')}
            </Text>
            <View style={styles.rowInputs}>
              <View style={{flex: 1, marginRight: 8}}>
                 <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.subtext}
                 />
              </View>
              <View style={{width: 80}}>
                 <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
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

            {/* 3. Sales Price (Conditional) */}
            {usageType === 'resale' && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[typography.h3, styles.label, { color: colors.text }]}>
                   {t('item.salePrice', 'Sale Price (Net)')}
                </Text>
                <View style={styles.rowInputs}>
                  <View style={{flex: 1, marginRight: 8}}>
                     <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        value={salePrice}
                        onChangeText={setSalePrice}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={colors.subtext}
                     />
                  </View>
                  <View style={{width: 80}}>
                     <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
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

        {/* --- EXISTING OPTIONAL FIELDS --- */}
        <View style={{ marginTop: 20 }}>
            <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.restockThreshold*')}</Text>
            <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={restockThreshold}
            onChangeText={setRestockThreshold}
            keyboardType="numeric"
            />
        </View>

        <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={[typography.button, styles.buttonText, { color: '#fff' }]}>{t('general.save')}</Text>}
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contentContainer: { padding: 24, paddingBottom: 50 },
  label: { marginBottom: 8, fontWeight: '500' },
  subLabel: { marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, height: 50, fontSize: 16 },
  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  buttonText: { fontWeight: 'bold' },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  stepperButton: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 8 },
  qtyInput: { flex: 1, height: 50, textAlign: 'center', fontSize: 22, fontWeight: 'bold' },
  
  // New Styles
  toggleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, marginBottom: 12, borderTopWidth: 1 },
  financialContainer: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  usageRow: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#ccc', marginBottom: 16 },
  usageBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  rowInputs: { flexDirection: 'row' },
  taxRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 8 },
  taxChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  divider: { height: 1, width: '100%', marginVertical: 16 },
});