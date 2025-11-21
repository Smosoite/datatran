import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useTranslation } from 'react-i18next';
import { useTheme, Colors } from '../providers/ThemeProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';

const warehouseIcons = ['archive', 'home', 'truck', 'database', 'briefcase', 'shopping-bag', 'hard-drive', 'server'];

export default function CreateWarehouseScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useAuth();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [icon, setIcon] = useState(warehouseIcons[0]);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
     showError(error.message);(t('general.nameReq'));
      return;
    }
    if (!profile?.workgroup_id) {
      showError(error.message);(t('general.error'), t('general.workgroupDetails'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('warehouses').insert({
        name: name.trim(),
        description: description.trim(),
        address: address.trim(),
        icon: icon,
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      <Text style={[typography.h3, styles.header, { color: colors.text }]}>{t('warehouse.createHeader')}</Text>

      <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('warehouse.name')}</Text>
      <TextInput
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        value={name}
        onChangeText={setName}
        placeholderTextColor={colors.subtext}
      />

      <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('warehouse.icon')}</Text>
      <View style={[styles.iconContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {warehouseIcons.map((item) => (
          <Pressable
            key={item}
            style={[
  styles.iconButton, 
  icon === item && [
    styles.iconSelected, 
    { 
      borderColor: colors.primary, 
      backgroundColor: colors.primaryMuted // A new color in your theme
    }
  ]
]}
            onPress={() => setIcon(item)}
          >
            <Feather 
  name={item} 
  size={32} 
  color={icon === item ? colors.primary : colors.text} 
/>
          </Pressable>
        ))}
      </View>

      <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('warehouse.description')}</Text>
      <TextInput
        style={[typography.body, styles.input, styles.multilineInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder={t('general.short')}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('warehouse.address')}</Text>
      <TextInput
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        value={address}
        onChangeText={setAddress}
        placeholderTextColor={colors.subtext}
      />
      
<Pressable style={[typography.button, styles.button, { backgroundColor: colors.primary }]} onPress={handleCreate} disabled={loading}>
  {loading ? (
    <ActivityIndicator color={colors.text || '#fff'} />
  ) : (
    <Text style={[typography.button, styles.buttonText, { color: colors.text || '#fff' }]}>{t('warehouse.createButton')}</Text>
  )}
</Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 24 },
  header: { fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  label: { marginBottom: 8, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 24 },
  multilineInput: { minHeight: 100, textAlignVertical: 'top' },
  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { fontWeight: 'bold' },
  iconContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', marginBottom: 24, borderRadius: 8, paddingVertical: 8, borderWidth: 1 },
  iconButton: { padding: 8, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  iconSelected: { /* This can be an empty object or just define non-color properties if needed */ },
  iconText: { fontSize: 32 },
});