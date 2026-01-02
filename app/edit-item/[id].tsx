import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../providers/ThemeProvider';
import { showError, showSuccess } from '../../lib/toast';
import { typography } from '../../styles/typography';

export default function EditItemScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme(); // --- FIX: Correct way to get color.s ---
  const router = useRouter();

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [restockThreshold, setRestockThreshold] = useState('');
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
       showError(error.message);(t('general.error'), t('general.failedItem'));
      } else if (data) {
        setName(data.name);
        setQuantity(data.quantity.toString());
        setRestockThreshold(data.restock_threshold.toString());
      }
      setLoading(false);
    };
    fetchItem();
  }, [id, t]); // Added `t` to dependency array

  const handleUpdate = async () => {
    if (!name || !quantity || !restockThreshold || !id) {
      showError(error.message);(t('general.error'), t('general.fillFields'));
      return;
    }
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('items')
        .update({
          name: name.trim(),
          quantity: parseInt(quantity, 10),
          restock_threshold: parseInt(restockThreshold, 10),
        })
        .eq('id', id);

      if (error) throw error;
      showSuccess(error.message);(t('general.success'), t('general.itemSuccess'));
      router.back();
    } catch (error: any) {
     showError(error.message);(t('general.error'), error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: colors.background }} size="large" color={colors.primary} />;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.contentContainer}>
      <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.itemName*')}</Text>
      <TextInput style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={name} onChangeText={setName} />
      
      <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.quantity*')}</Text>
      <TextInput style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
      
      {/* --- FIX: Applied theme styles to this input and its label --- */}
      <Text style={typography.h3, [styles.label, { color: colors.text }]}>{t('item.restockThreshold*')}</Text>
      <TextInput style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={restockThreshold} onChangeText={setRestockThreshold} keyboardType="numeric" />
      
      {/* --- FIX: Correctly styled the button and added a loading indicator --- */}
      <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleUpdate} disabled={updating}>
        {updating ? (
          <ActivityIndicator color={colors.text || '#fff'} />
        ) : (
          <Text style={[typography.button, styles.buttonText, { color: colors.text || '#fff' }]}>{t('general.save')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

// --- FIX: Stylesheet cleaned of hard-coded colors ---
const styles = StyleSheet.create({
  contentContainer: { padding: 24 },
  label: { marginBottom: 8, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 24 },
  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 18 },
  buttonText: { fontWeight: 'bold' },
});