import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';

export default function JoinWorkgroupScreen() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme(); 
  const { session, refreshProfile } = useAuth();

  const handleJoin = async () => {
    if (!code.trim() || !session?.user) {
      return;
    }

    setLoading(true);
    
    try {
      const { data: workgroupData, error: workgroupError } = await supabase
        .from('workgroups')
        .select('id')
        .eq('passcode', code.trim().toUpperCase())
        .single();

      if (workgroupError || !workgroupData) {
        throw new Error(t('restock.invalidNo')); // Using existing key for "Invalid"
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ workgroup_id: workgroupData.id, role: 'member' })
        .eq('id', session.user.id);

      if (profileError) throw profileError;

      // --- FIX: Corrected Success Logic ---
      showSuccess(t('general.success'), t('auth.joinedGroup'));
      
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
      <Text style={[typography.h3, styles.header, { color: colors.text }]}>{t('auth.joinWorkgroupHeader')}</Text>
      <TextInput
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder={t('auth.joinCode')}
        placeholderTextColor={colors.subtext}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
      />
      <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleJoin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.text || '#fff'} />
        ) : (
          <Text style={[typography.button, styles.buttonText, { color: colors.text || '#fff' }]}>{t('auth.joinGroup')}</Text>
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