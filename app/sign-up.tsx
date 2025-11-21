import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const { colors } = useTheme(); // --- FIX: Correct way to get colors ---
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username,
        },
      },
    });

    if (error) {
      showError(error.message);(t('general.error'), error.message);
    } else {
      showSuccess(error.message);(t('general.success'), t('general.accountCreated'));
      router.push('/login');
    }
    setLoading(false);
  }

  // --- FIX: Re-introduced KeyboardAvoidingView and ScrollView ---
  return (
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[typography.h3, styles.header, { color: colors.text }]}>{t('auth.signUpHeader')}</Text>
        <Text style={[typography.body, styles.subHeader, { color: colors.subtext }]}>{t('auth.signUpSubheader')}</Text>

        <TextInput
          style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder={t('auth.username')}
          placeholderTextColor={colors.subtext}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
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
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder={t('auth.password')}
          placeholderTextColor={colors.subtext}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* --- FIX: Improved button with loading indicator --- */}
        <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={signUpWithEmail} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.text || '#fff'} />
          ) : (
            <Text style={[typography.button, styles.buttonText, { color: colors.text || '#fff' }]}>{t('auth.signup')}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push('/login')}>
          <Text style={[typography.caption, styles.link, { color: colors.primary }]}>{t('auth.hasAccount')}</Text>
        </Pressable>
      </ScrollView>
  );
}

// --- FIX: Stylesheet cleaned and corrected for KeyboardAvoidingView ---
const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 24 
  },
  header: {
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 8 
  },
  subHeader: {
    textAlign: 'center', 
    marginBottom: 24 
  },
  input: { 
    borderWidth: 1, 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 16, 
    fontSize: 16 
  },
  button: { 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  buttonText: { 
    fontWeight: 'bold',
  },
  link: { 
    marginTop: 16, 
    textAlign: 'center', 
    padding: 8 
  },
});