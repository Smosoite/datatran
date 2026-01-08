import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../providers/ThemeProvider';
import { typography } from '../styles/typography';
import { showError } from '../lib/toast';
import { Feather } from '@expo/vector-icons';
import { useOnboarding } from '../providers/OnboardingProvider';
import { useSubscription } from '../hooks/useSubscription';

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { completeOnboarding } = useOnboarding();
  const { startTrial } = useSubscription();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showError(t('general.error'), error.message);
      setLoading(false);
      return;
    }

    if (data.user && params.start_trial === 'true') {
      await startTrial();
    }

    await completeOnboarding();
    router.replace('/(tabs)');
  };

  const handleForgotPassword = async () => {
    if (!email) {
      showError(t('general.error'), t('login.emailRequired'));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) showError(t('general.error'), error.message);
    else showError(t('general.success'), t('login.resetEmailSent'));
    setLoading(false);
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setLangOpen(false);
  };

  const getCurrentFlag = () => i18n.language === 'fi' ? '🇫🇮' : '🇺🇸';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* LANGUAGE DROPDOWN (Top Right) */}
      <View style={styles.languageContainer}>
        <TouchableOpacity 
            style={[styles.langTrigger, { backgroundColor: colors.card, borderColor: colors.border }]} 
            onPress={() => setLangOpen(!langOpen)}
        >
            <Text style={{ fontSize: 20 }}>{getCurrentFlag()}</Text>
            <Feather name={langOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.subtext} />
        </TouchableOpacity>

        {langOpen && (
            <View style={[styles.langDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity style={styles.langOption} onPress={() => changeLanguage('en')}>
                    <Text style={{ fontSize: 20 }}>🇺🇸</Text>
                    <Text style={[typography.caption, { color: colors.text, marginLeft: 8 }]}>English</Text>
                </TouchableOpacity>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.langOption} onPress={() => changeLanguage('fi')}>
                    <Text style={{ fontSize: 20 }}>🇫🇮</Text>
                    <Text style={[typography.caption, { color: colors.text, marginLeft: 8 }]}>Suomi</Text>
                </TouchableOpacity>
            </View>
        )}
      </View>

      <View style={styles.header}>
        <Text style={[typography.h1, { color: colors.text, textAlign: 'center' }]}>StoreTool</Text>
        <Text style={[typography.body, { color: colors.subtext, textAlign: 'center', marginTop: 8 }]}>
          {t('login.subtitle', 'Sign in to manage your inventory')}
        </Text>
        {/* Visual feedback if trial flow active */}
        {params.start_trial === 'true' && (
             <Text style={[typography.caption, { color: colors.success || 'green', textAlign: 'center', marginTop: 8 }]}>
                {t('login.activatingTrial', 'Activating your 7-Day Free Trial')}
             </Text>
        )}
      </View>

      <View style={styles.form}>
        <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('login.email', 'Email')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="name@company.com"
          placeholderTextColor={colors.subtext}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('login.password', 'Password')}</Text>
        
        <View style={[styles.passwordContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
            style={[styles.passwordInput, { color: colors.text }]}
            placeholder="********"
            placeholderTextColor={colors.subtext}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            />
            
            <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? t('login.hidePassword', 'Hide password') : t('login.showPassword', 'Show password')}
            >
                <Feather 
                    name={showPassword ? "eye" : "eye-off"} 
                    size={20} 
                    color={colors.subtext} 
                />
            </TouchableOpacity>
        </View>

        <Pressable onPress={handleForgotPassword} style={styles.forgotPassword} disabled={loading}>
          <Text style={[typography.caption, { color: colors.primary }]}>{t('login.forgotPassword', 'Forgot Password?')}</Text>
        </Pressable>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 40 },
  form: { width: '100%' },
  label: { marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 20 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, marginBottom: 20 },
  passwordInput: { flex: 1, padding: 16 },
  eyeIcon: { padding: 16 },
  forgotPassword: { marginTop: 10, alignItems: 'flex-end' },
  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  linkButton: { marginTop: 20, alignItems: 'center' },
  languageContainer: { position: 'absolute', top: 50, right: 24, zIndex: 10 },
  langTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  langDropdown: { position: 'absolute', top: 45, right: 0, borderRadius: 12, borderWidth: 1, padding: 4, minWidth: 120, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 },
  langOption: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  divider: { height: 1, width: '100%', opacity: 0.5 }
});