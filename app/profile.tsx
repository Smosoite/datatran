import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme(); // --- FIX: Correct way to get colors ---
  const { profile, refreshProfile } = useAuth(); // Get refreshProfile to update UI
  
  const [username, setUsername] = useState(profile?.username || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async () => {
    if (!username.trim()) {
     showError(error.message);(t('profile.noUserName'));
      return;
    }

    setLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', profile?.id);
      
      if (profileError) throw profileError;

      if (password) {
        if (password !== confirmPassword) {
          showError(error.message);(t('auth.passwordNoMatch'));
          setLoading(false);
          return;
        }
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) throw passwordError;
      }

      await refreshProfile(); // Refresh the profile data in the app
      showSuccess(error.message);(t('general.success'), t('profile.updateSuccess'));
      router.back();

    } catch (error: any) {
      showError(error.message);(t('general.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: colors.background }} 
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[typography.h3, styles.header, { color: colors.text }]}>{t('profile.editHeader')}</Text>

      <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('auth.username')}</Text>
      <TextInput
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        value={username}
        onChangeText={setUsername}
      />
      
      <Text style={[typography.body, styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>{t('profile.changePassword')}</Text>
      <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('profile.newPassword')}</Text>
      <TextInput
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder={t('profile.newPasswordPlaceholder')}
        placeholderTextColor={colors.subtext}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('profile.confirmPassword')}</Text>
      <TextInput
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder={t('profile.confirmPassword')}
        placeholderTextColor={colors.subtext}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      
      {/* --- FIX: Improved button with loading indicator --- */}
      <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleUpdateProfile} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.text || '#fff'} />
        ) : (
          <Text style={[typography.button, styles.buttonText, { color: colors.selector || '#fff' }]}>{t('general.save')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

// --- FIX: Stylesheet cleaned of hard-coded colors ---
const styles = StyleSheet.create({
  contentContainer: { padding: 24 },
  header: { fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  sectionTitle: { fontWeight: '600', marginTop: 24, marginBottom: 16, borderBottomWidth: 1, paddingBottom: 8 },
  label: { marginBottom: 8, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 16 },
  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  buttonText: { fontWeight: 'bold' },
});