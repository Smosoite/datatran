import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Alert, StyleSheet, View, Text, TextInput, Pressable, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';

export default function JoinWorkgroupScreen() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme(); // --- FIX: Correct way to get colors ---
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
        .eq('join_code', code.trim().toUpperCase())
        .single();
      if (workgroupError || !workgroupData) {
        throw new Error(t('restock.invalidNo'));
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ workgroup_id: workgroupData.id, role: 'member' })
        .eq('id', session.user.id);
      if (profileError) throw profileError;

      showSuccess(error.message);(
        t('general.success'),
        t('auth.joinedGroup'),
        [{ text: 'OK', onPress: async () => await refreshProfile() }]
      );

    } catch (error: any) {
      showError(error.message);(t('general.error'), error.message);
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
      {/* --- FIX: Improved button with loading indicator --- */}
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

// --- FIX: Stylesheet cleaned of hard-coded colors ---
const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24 },
    header: { fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
    input: { borderWidth: 1, padding: 16, borderRadius: 8, marginBottom: 16 },
    button: { padding: 16, borderRadius: 8, alignItems: 'center' },
    buttonText: { fontWeight: 'bold' },
});