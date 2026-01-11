import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const { colors } = useTheme();
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

    // --- FIX START: Cleaned up logic ---
    if (error) {
      // Error exists, show it
      showError(t('general.error'), error.message);
    } else {
      // Success (Error is null here, so don't try to read error.message)
      showSuccess(t('general.success'), t('general.accountCreated'));
      router.push('/login');
    }
    // --- FIX END ---
    
    setLoading(false);
  }

  return (
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[typography.h3, styles.header, { color: colors.text }]}>{t('auth.signUpHeader')}</Text>
        <Text style={[typography.body, styles.subHeader, { color: colors.subtext }]}>{t('auth.signUpSubheader')}</Text>

        <TextInput
          style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder={t('auth.username1')}
          placeholderTextColor={colors.subtext}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder={t('auth.email1')}
          placeholderTextColor={colors.subtext}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder={t('auth.password1')}
          placeholderTextColor={colors.subtext}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

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