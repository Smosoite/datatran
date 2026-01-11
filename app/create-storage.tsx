import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';

export default function CreateStorageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { warehouseId } = useLocalSearchParams<{ warehouseId: string }>();
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleCreateStorage = async () => {
    if (!name.trim()) {
      showError(error.message);(t('general.nameRequired'));
      return;
    }
    if (!warehouseId || !profile?.workgroup_id) {
      showError(error.message);(t('general.error'), t('general.wareID'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('storages').insert({
        name: name.trim(),
        warehouse_id: warehouseId,
        workgroup_id: profile.workgroup_id,
      });

      if (error) throw error;
      router.back();
    } catch (error: any) {
      showError(error.message);(t('general.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.h3, styles.header, { color: colors.text }]}>{t('storage.createHeader')}</Text>
      <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('storage.name')}</Text>
      <TextInput
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        // --- FIX: Used translation key for placeholder ---
        placeholder={t('storage.namePlaceholder')}
        placeholderTextColor={colors.subtext}
        value={name}
        onChangeText={setName}
      />
      <Pressable style={[styles.button, { backgroundColor: colors.selector }]} onPress={handleCreateStorage} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.text || '#fff'} />
        ) : (
          <Text style={[typography.button, styles.buttonText, { color: colors.text || '#fff' }]}>{t('storage.createButton')}</Text>
        )}
      </Pressable>
    </View>
  );
}

// --- FIX: Stylesheet cleaned of hard-coded colors ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 24,
    justifyContent: 'center' // Center content for a simple form
  },
  header: { 
    fontWeight: 'bold', 
    marginBottom: 24, 
    textAlign: 'center' 
  },
  label: {
    marginBottom: 8, 
    fontWeight: '500' 
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  button: { 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  buttonText: { 
    fontWeight: 'bold',
  },
});