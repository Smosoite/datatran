import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { generateJoinCode } from '../lib/nanoid';
import { useTheme } from '../providers/ThemeProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';

export default function CreateWorkgroupScreen() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme(); 
  const { session, refreshProfile } = useAuth();

  const handleCreate = async () => {
    if (!name.trim() || !session?.user) {
      return;
    }

    setLoading(true);

    try {
      const joinCode = generateJoinCode();
      const { data: workgroupData, error: workgroupError } = await supabase
        .from('workgroups')
        .insert({ name: name.trim(), owner_id: session.user.id, join_code: joinCode })
        .select('id')
        .single();

      if (workgroupError) throw workgroupError;
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ workgroup_id: workgroupData.id, role: 'admin' })
        .eq('id', session.user.id);

      if (profileError) throw profileError;

      // --- FIX: Corrected Success Logic ---
      showSuccess(t('general.success'), t('general.workgroupSuccess'));
      
      // Force profile refresh to update global state and trigger navigation
      await refreshProfile(); 

    } catch (error: any) {
      showError(t('general.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.h3, styles.header, { color: colors.text }]}>{t('auth.createWorkgroupHeader')}</Text>
      <TextInput
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder={t('workgroup.namePlaceholder')}
        placeholderTextColor={colors.subtext}
        value={name}
        onChangeText={setName}
      />
      <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleCreate} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.text || '#fff'} />
        ) : (
          <Text style={[typography.button, styles.buttonText, { color: colors.text || '#fff' }]}>{t('workgroup.createButton')}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24 },
    header: { fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
    input: { borderWidth: 1, padding: 16, borderRadius: 8, marginBottom: 16 },
    button: { padding: 16, borderRadius: 8, alignItems: 'center' },
    buttonText: { fontWeight: 'bold' },
});