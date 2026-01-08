import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider'; // Added
import { showError, showSuccess } from '../../lib/toast';
import { typography } from '../../styles/typography';
import { logActivity } from '../../lib/logger'; // Added

export default function EditItemScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { profile, workgroup } = useAuth(); // Needed for logging
  const router = useRouter();

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [restockThreshold, setRestockThreshold] = useState('');
  
  // New State for Cost & Barcode
  const [cost, setCost] = useState('');
  const [barcodeValue, setBarcodeValue] = useState('');

  // Track original quantity to calculate changes for the log
  const [originalQuantity, setOriginalQuantity] = useState(0);

  // Adjustment State
  const [adjustmentMode, setAdjustmentMode] = useState<'none' | 'add' | 'remove'>('none');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return;
      setLoading(true);
      
      // Updated query to fetch cost_per_unit and barcode
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
        setOriginalQuantity(data.quantity); // Store original for diff calc
        setRestockThreshold(data.restock_threshold.toString());
        
        // Handle optional fields
        setCost(data.cost_per_unit ? data.cost_per_unit.toString() : '');
        setBarcodeValue(data.barcode || '');
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
      const newQuantity = parseInt(quantity, 10);

      const updates = {
          name: name.trim(),
          quantity: newQuantity,
          restock_threshold: parseInt(restockThreshold, 10),
          // Parse cost to float, handle comma/dot
          cost_per_unit: cost.trim() ? parseFloat(cost.replace(',', '.')) : null,
          barcode: barcodeValue.trim() || null,
      };

      const { error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // --- LOGGING ---
      if (workgroup?.id) {
        const qtyDiff = newQuantity - originalQuantity;
        
        // Only log if there is a meaningful change (quantity, or just a general update)
        // You can refine this to only log if qtyDiff !== 0 if you prefer
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

  if (loading) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: colors.background }} size="large" color={colors.primary} />;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.contentContainer}>
      
      {/* 1. Name */}
      <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.itemName*')}</Text>
      <TextInput 
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
        value={name} 
        onChangeText={setName} 
      />
      
      {/* 2. Quantity (Stepper) */}
      <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.quantity*')}</Text>
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
                  <Pressable onPress={applyBulkAdjustment} style={[styles.miniBtn, { backgroundColor: colors.primary }]}>
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

      {/* 5. Cost Per Unit (New) */}
      <Text style={[typography.h3, styles.label, { color: colors.text }]}>
           {t('item.costPerUnit', 'Cost per unit')}
      </Text>
      <TextInput
         style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
         value={cost}
         onChangeText={setCost}
         keyboardType="decimal-pad"
         placeholder={t('cost.example', '0.00')} 
         placeholderTextColor={colors.subtext}
      />

      {/* 6. Barcode (New) */}
      <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.barcode', 'Barcode (Optional)')}</Text>
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
  input: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 12 },
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
  miniBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 6 }
});