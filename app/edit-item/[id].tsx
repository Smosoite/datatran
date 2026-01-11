import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { showError, showSuccess } from '../../lib/toast';
import { typography } from '../../styles/typography';
import { logActivity } from '../../lib/logger';

// Helper for Finnish Tax Brackets
const TAX_BRACKETS = [
  { label: '25.5%', value: '25.5' },
  { label: '14%', value: '14' },
  { label: '10%', value: '10' }, 
  { label: '0%', value: '0' },
];

export default function EditItemScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { profile, workgroup } = useAuth();
  const router = useRouter();

  // Basic Info
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [restockThreshold, setRestockThreshold] = useState('');
  const [barcodeValue, setBarcodeValue] = useState('');

  // Financial & Tax Info
  const [showFinancials, setShowFinancials] = useState(false);
  const [usageType, setUsageType] = useState<'production' | 'resale'>('production');
  
  // Costs
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseTax, setPurchaseTax] = useState('25.5');
  
  // Sales
  const [salePrice, setSalePrice] = useState('');
  const [saleTax, setSaleTax] = useState('25.5');

  // Track original quantity for logs
  const [originalQuantity, setOriginalQuantity] = useState(0);

  // Adjustment State (Stock In/Out)
  const [adjustmentMode, setAdjustmentMode] = useState<'none' | 'add' | 'remove'>('none');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        showError(t('general.error'), error.message);
      } else if (data) {
        setName(data.name);
        setQuantity(data.quantity.toString());
        setOriginalQuantity(data.quantity);
        setRestockThreshold(data.restock_threshold.toString());
        setBarcodeValue(data.barcode || '');

        // Map Financial Data
        // If modern fields exist, use them. Fallback to old 'cost_per_unit' if purchase_price is null
        const pPrice = data.purchase_price !== null ? data.purchase_price : data.cost_per_unit;
        
        setUsageType(data.usage_type || 'production');
        setPurchasePrice(pPrice ? pPrice.toString() : '');
        setPurchaseTax(data.purchase_vat_percent ? data.purchase_vat_percent.toString() : '25.5');
        
        setSalePrice(data.sale_price ? data.sale_price.toString() : '');
        setSaleTax(data.sale_vat_percent ? data.sale_vat_percent.toString() : '25.5');

        // Auto-expand if financial data was previously set
        if (data.usage_type || pPrice || data.sale_price) {
          setShowFinancials(true);
        }
      }
      setLoading(false);
    };
    fetchItem();
  }, [id, t]);

  // --- ACTIONS ---

  const increment = () => setQuantity(prev => (parseInt(prev || '0', 10) + 1).toString());
  const decrement = () => setQuantity(prev => {
      const val = parseInt(prev || '0', 10);
      return val > 0 ? (val - 1).toString() : '0';
  });

  const applyBulkAdjustment = () => {
      if (!adjustmentAmount) return;
      const amt = parseInt(adjustmentAmount, 10);
      if (isNaN(amt)) return;

      const current = parseInt(quantity || '0', 10);
      let newVal = current;
      
      if (adjustmentMode === 'add') newVal += amt;
      if (adjustmentMode === 'remove') newVal = Math.max(0, newVal - amt);

      setQuantity(newVal.toString());
      setAdjustmentMode('none');
      setAdjustmentAmount('');
  };

  const handleUpdate = async () => {
    if (!name || !quantity || !restockThreshold || !id) {
      showError(t('general.error'), t('general.fillFields'));
      return;
    }

    if (!profile?.workgroup_id) {
       showError(t('general.error'), 'No active workgroup found.');
       return;
    }

    setUpdating(true);
    try {
      // Helper to parse floats safely
      const parseNum = (str: string) => str.trim() ? parseFloat(str.replace(',', '.')) : null;
      const newQuantity = parseInt(quantity, 10);

      const updates = {
          name: name.trim(),
          quantity: newQuantity,
          restock_threshold: parseInt(restockThreshold, 10),
          barcode: barcodeValue.trim() || null,
          
          // New Financial Fields
          usage_type: showFinancials ? usageType : 'production',
          purchase_price: showFinancials ? parseNum(purchasePrice) : null,
          purchase_vat_percent: showFinancials ? parseNum(purchaseTax) : null,
          // Only save sales info if resale
          sale_price: (showFinancials && usageType === 'resale') ? parseNum(salePrice) : null,
          sale_vat_percent: (showFinancials && usageType === 'resale') ? parseNum(saleTax) : null,
          
          // Update legacy field for backward compatibility if you wish, or null it out
          cost_per_unit: showFinancials ? parseNum(purchasePrice) : null
      };

      const { error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // --- LOGGING ---
      if (workgroup?.id) {
        const qtyDiff = newQuantity - originalQuantity;
        // Log if quantity changed OR if important info changed
        await logActivity({
          workgroup_id: workgroup.id,
          item_id: id,
          item_name: updates.name,
          action: 'UPDATE', 
          change_amount: qtyDiff, 
          final_quantity: newQuantity
        });
      }

      showSuccess(t('general.success'), t('general.itemSuccess'));
      router.back();
    } catch (error: any) {
      showError(t('general.error'), error.message);
    } finally {
      setUpdating(false);
    }
  };

  // Tax Button Component
  const TaxSelector = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
    <View style={styles.taxRow}>
      {TAX_BRACKETS.map((bracket) => (
        <Pressable
          key={bracket.label}
          onPress={() => onChange(bracket.value)}
          style={[
            styles.taxChip,
            { 
              backgroundColor: value === bracket.value ? colors.selector : colors.card,
              borderColor: value === bracket.value ? colors.selector : colors.border
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

  if (loading) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: colors.background }} size="large" color={colors.primary} />;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.contentContainer}>
      
      {/* 1. Name */}
      <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.name')}</Text>
      <TextInput 
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
        value={name} 
        onChangeText={setName} 
      />
      
      {/* 2. Quantity (Stepper) */}
      <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.quantity')}</Text>
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

      {/* 3. Quick Actions (Stock In / Stock Out) */}
      {adjustmentMode === 'none' ? (
          <View style={styles.quickActionRow}>
             <Pressable style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setAdjustmentMode('add')}>
                 <FontAwesome name="download" size={14} color={colors.success} style={{marginBottom:4}} />
                 <Text style={[typography.caption, { color: colors.text }]}>{t('item.stockIn', 'Stock In')}</Text>
             </Pressable>
             <Pressable style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setAdjustmentMode('remove')}>
                 <FontAwesome name="upload" size={14} color={colors.danger} style={{marginBottom:4}} />
                 <Text style={[typography.caption, { color: colors.text }]}>{t('item.stockOut', 'Stock Out')}</Text>
             </Pressable>
          </View>
      ) : (
          <View style={[styles.adjustContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[typography.caption, {color: colors.text, marginBottom: 8}]}>
                  {adjustmentMode === 'add' ? t('item.addStockAmount', 'Add Stock Amount:') : t('item.removeStockAmount', 'Remove Stock Amount:')}
              </Text>
              <View style={{flexDirection: 'row', gap: 10}}>
                  <TextInput 
                    style={[styles.miniInput, { color: colors.text, borderColor: colors.border }]}
                    value={adjustmentAmount}
                    onChangeText={setAdjustmentAmount}
                    keyboardType="numeric"
                    autoFocus
                    placeholder="#"
                    placeholderTextColor={colors.subtext}
                  />
                  <Pressable onPress={applyBulkAdjustment} style={[styles.miniBtn, { backgroundColor: colors.selector }]}>
                     <FontAwesome name="check" size={16} color="#fff" />
                  </Pressable>
                  <Pressable onPress={() => { setAdjustmentMode('none'); setAdjustmentAmount(''); }} style={[styles.miniBtn, { backgroundColor: colors.subtext }]}>
                     <FontAwesome name="times" size={16} color="#fff" />
                  </Pressable>
              </View>
          </View>
      )}
      
      {/* 4. Threshold */}
      <Text style={[typography.h3, styles.label, { color: colors.text, marginTop: 24 }]}>{t('item.restockThreshold*')}</Text>
      <TextInput 
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
        value={restockThreshold} 
        onChangeText={setRestockThreshold} 
        keyboardType="numeric" 
      />

       {/* --- NEW FINANCIAL SECTION --- */}
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
          
          {/* Usage Type */}
          <Text style={[typography.caption, styles.subLabel, { color: colors.subtext }]}>
              {t('item.usageType', 'Item Usage')}
          </Text>
          <View style={styles.usageRow}>
            <Pressable 
              style={[styles.usageBtn, usageType === 'production' && { backgroundColor: colors.selector }]}
              onPress={() => setUsageType('production')}
            >
               <Text style={[typography.body, { color: usageType === 'production' ? '#fff' : colors.text }]}>
                 {t('item.production', 'Production')}
               </Text>
            </Pressable>
            <Pressable 
              style={[styles.usageBtn, usageType === 'resale' && { backgroundColor: colors.selector }]}
              onPress={() => setUsageType('resale')}
            >
               <Text style={[typography.body, { color: usageType === 'resale' ? '#fff' : colors.text }]}>
                 {t('item.resale', 'Resale')}
               </Text>
            </Pressable>
          </View>

          {/* Purchase Cost */}
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

          {/* Sales Price (Conditional) */}
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

      {/* 6. Barcode */}
      <Text style={[typography.h3, styles.label, { color: colors.text, marginTop: 12 }]}>{t('item.barcode', 'Barcode (Optional)')}</Text>
      <TextInput
          style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={barcodeValue}
          onChangeText={setBarcodeValue}
          keyboardType="numeric"
          placeholder={t('item.barcodePlaceholder', 'Enter barcode')}
          placeholderTextColor={colors.subtext}
      />
      
      {/* 7. Save Button */}
      <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleUpdate} disabled={updating}>
        {updating ? (
          <ActivityIndicator color={colors.text || '#fff'} />
        ) : (
          <Text style={[typography.button, styles.buttonText, { color: '#fff' }]}>{t('general.save')}</Text>
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
  input: { borderWidth: 1, borderRadius: 8, padding: 12, height: 50, fontSize: 16, marginBottom: 12 },
  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  buttonText: { fontWeight: 'bold' },
  
  // Stepper Styles
  stepperContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  stepperButton: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 8 },
  qtyInput: { flex: 1, height: 50, textAlign: 'center', fontSize: 22, fontWeight: 'bold' },

  // Quick Actions
  quickActionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, padding: 12, alignItems: 'center', borderWidth: 1, borderRadius: 8 },
  
  // Adjust Mode
  adjustContainer: { padding: 12, borderRadius: 8, borderWidth: 1 },
  miniInput: { flex: 1, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, height: 40 },
  miniBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 6 },

  // New Financial Styles
  toggleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, marginBottom: 12, borderTopWidth: 1 },
  financialContainer: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  usageRow: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#ccc', marginBottom: 16 },
  usageBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  rowInputs: { flexDirection: 'row' },
  taxRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 8 },
  taxChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  divider: { height: 1, width: '100%', marginVertical: 16 },
});