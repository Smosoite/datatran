import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(t('general.error'), error.message);
      setLoading(false);
    } else {
      // Router will handle redirection via AuthProvider
    }
  };

  // --- NEW: Language Toggle ---
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      <View style={styles.header}>
        <Text style={[typography.h1, { color: colors.text, textAlign: 'center' }]}>Warehouse Pro</Text>
        <Text style={[typography.body, { color: colors.subtext, textAlign: 'center', marginTop: 8 }]}>
          {t('login.subtitle', 'Sign in to manage your inventory')}
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('auth.email', 'Email')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="name@company.com"
          placeholderTextColor={colors.subtext}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('auth.password')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="********"
          placeholderTextColor={colors.subtext}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable 
          style={[styles.button, { backgroundColor: colors.primary }]} 
          onPress={handleLogin} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={[typography.button, { color: colors.primaryText }]}>{t('login.signIn', 'Sign In')}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push('/sign-up')} style={styles.linkButton}>
          <Text style={[typography.body, { color: colors.primary }]}>{t('login.noAccount', "Don't have an account? Sign Up")}</Text>
        </Pressable>
      </View>

      {/* --- LANGUAGE OPTIONS --- */}
      <View style={styles.langContainer}>
        <Pressable 
            onPress={() => changeLanguage('en')} 
            style={[styles.langButton, i18n.language === 'en' && { backgroundColor: colors.selector }]}
        >
            <Text style={{ fontSize: 24 }}>🇺🇸</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: i18n.language === 'en' ? 'bold' : 'normal' }]}>English</Text>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Pressable 
            onPress={() => changeLanguage('fi')} 
            style={[styles.langButton, i18n.language === 'fi' && { backgroundColor: colors.selector }]}
        >
            <Text style={{ fontSize: 24 }}>🇫🇮</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: i18n.language === 'fi' ? 'bold' : 'normal' }]}>Suomi</Text>
        </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 40 },
  form: { width: '100%' },
  label: { marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 20 },
  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  linkButton: { marginTop: 20, alignItems: 'center' },
  
  // Language Styles
  langContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 60,
      gap: 20
  },
  langButton: {
      alignItems: 'center',
      padding: 10,
      borderRadius: 8,
      minWidth: 80
  },
  divider: {
      width: 1,
      height: 40,
  }
});