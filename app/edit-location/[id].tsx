import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../providers/ThemeProvider';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '../../lib/toast';
import { typography } from '../../styles/typography';

export default function EditLocationScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme(); // --- FIX: Correct way to get colors ---
  const router = useRouter();

  const [shelf, setShelf] = useState('');
  const [row, setRow] = useState('');
  const [column, setColumn] = useState('');
  const [container, setContainer] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchLocation = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('defined_locations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        // --- FIX: Used translation key for alert ---
       showError(error.message);(t('general.error'), t('location.fetchError'));
      } else if (data) {
        setShelf(data.shelf || '');
        setRow(data.row || '');
        setColumn(data.column || '');
        setContainer(data.container || '');
      }
      setLoading(false);
    };
    fetchLocation();
  }, [id, t]);

  const handleUpdate = async () => {
    if (!shelf.trim()) {
      showError(error.message);(t('general.error'), t('location.shelfReq')); // Using translation key
      return;
    }
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('defined_locations')
        .update({
          shelf: shelf.trim(),
          row: row.trim() || null,
          column: column.trim() || null,
          container: container.trim() || null,
        })
        .eq('id', id);

      if (error) throw error;
      // --- FIX: Used translation key for alert ---
      showSuccess(error.message);(t('general.success'), t('location.updateSuccess'));
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
      <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('location.shelf')}</Text>
      <TextInput style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={shelf} onChangeText={setShelf} />
      
      <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('location.row')}</Text>
      <TextInput style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={row} onChangeText={setRow} />

      <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('location.column')}</Text>
      <TextInput style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={column} onChangeText={setColumn} />

      <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('location.container')}</Text>
      <TextInput style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={container} onChangeText={setContainer} />
      
      {/* --- FIX: Improved button with loading indicator --- */}
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
  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { fontWeight: 'bold' },
});