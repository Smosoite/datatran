import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { colors } = useTheme(); // --- FIX: Correct way to get colors ---
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      showError(error.message);(t('general.error'), error.message);
    }
    setLoading(false);
  }

  // --- FIX: Re-introduced KeyboardAvoidingView ---
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingContainer}
    >
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[typography.h1, styles.header, { color: colors.text }]}>{t('auth.loginHeader')}</Text>
        <Text style={[typography.h2, styles.subHeader, { color: colors.subtext }]}>{t('auth.loginSubheader')}</Text>

        <TextInput
          style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder={t('auth.email')}
          placeholderTextColor={colors.subtext}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder={t('auth.password')}
          placeholderTextColor={colors.subtext}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* --- FIX: Improved button with loading indicator --- */}
        <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={signInWithEmail} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.text || '#fff'} />
          ) : (
            <Text style={[typography.button, styles.buttonText, { color: colors.text || '#fff' }]}>{t('auth.signIn')}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push('/paywall')}>
          <Text style={[typography.caption, styles.link, { color: colors.primary }]}>{t('auth.noAccount')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- FIX: Stylesheet cleaned and corrected for KeyboardAvoidingView ---
const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subHeader: {
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: 'bold',
  },
  link: {
    marginTop: 16,
    textAlign: 'center',
    padding: 8,
  },
});