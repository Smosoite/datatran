import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';
import { logActivity } from '../lib/logger';

export default function AddItemScreen() {
  const { t } = useTranslation();
  const { warehouseId, storageId, barcode } = useLocalSearchParams<{ warehouseId?: string; storageId?: string; barcode?: string }>();
  const { colors } = useTheme();
  const { profile, workgroup } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [restockThreshold, setRestockThreshold] = useState('10');
  const [cost, setCost] = useState(''); // New state for Cost
  const [barcodeValue, setBarcodeValue] = useState(barcode || '');
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

    if (!profile?.workgroup_id) {
      showError(t('general.error'), 'No active workgroup found.');
      return;
    }

    setSaving(true);
    try {
      const newItem = {
        name: name.trim(),
        quantity: parseInt(quantity, 10),
        restock_threshold: parseInt(restockThreshold, 10),
        // Parse cost to float if exists, otherwise null
        cost_per_unit: cost.trim() ? parseFloat(cost.replace(',', '.')) : null,
        barcode: barcodeValue.trim() || null,
        storage_id: storageId,
        workgroup_id: profile.workgroup_id,
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

  if (!warehouseId || !storageId) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: colors.background }} size="large" color={colors.primary} />;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.contentContainer}>

        <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.itemName*')}</Text>
        <TextInput
          style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
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

        <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.restockThreshold*')}</Text>
        <TextInput
          style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={restockThreshold}
          onChangeText={setRestockThreshold}
          keyboardType="numeric"
          placeholder="10"
          placeholderTextColor={colors.subtext}
        />

        {/* --- New Cost Field --- */}
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
        {/* ---------------------- */}

        <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.barcode', 'Barcode (Optional)')}</Text>
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
  input: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 16 },
  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  buttonText: { fontWeight: 'bold' },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  stepperButton: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 8 },
  qtyInput: { flex: 1, height: 50, textAlign: 'center', fontSize: 22, fontWeight: 'bold' },
});