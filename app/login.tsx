import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../providers/ThemeProvider';
import { typography } from '../styles/typography';
import { showError, showSuccess } from '../lib/toast'; // Assuming showSuccess exists, otherwise use showError with success color
import { Feather } from '@expo/vector-icons';
import { useOnboarding } from '../providers/OnboardingProvider';
import { useSubscription } from '../hooks/useSubscription';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { completeOnboarding } = useOnboarding();
  const { startTrial } = useSubscription();

  // --- Login State ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  // --- Forgot Password Flow State ---
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'password'>('email');
  
  // Forgot Password Inputs
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Visibility Toggles for Reset
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // --- Login Logic ---
  const handleLogin = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("LOGIN ERROR DETAILED:", JSON.stringify(error, null, 2));
      showError(t('general.error'), error.message);
      setLoading(false);
      return;
    }

    if (data.user && params.start_trial === 'true') {
      await startTrial();
    }

    await completeOnboarding();
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setLangOpen(false);
  };

  const getCurrentFlag = () => i18n.language === 'fi' ? '🇫🇮' : '🇺🇸';

  // --- Forgot Password Handlers ---

  // 1. Open Modal
  const initForgotPassword = () => {
    setResetEmail(email); // Pre-fill if they typed it in login
    setForgotStep('email');
    setResetToken('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowForgotModal(true);
  };

  // 2. Send Email
  const handleSendResetEmail = async () => {
    if (!resetEmail) {
      showError(t('general.error'), t('login.emailRequired'));
      return;
    }
    setResetLoading(true);
    
    // Send reset instructions (Supabase will send code/link)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
    
    setResetLoading(false);
    if (error) {
      showError(t('general.error'), error.message);
    } else {
      // Move to OTP step
      setForgotStep('otp');
    }
  };

  // 3. Verify OTP
  const handleVerifyOtp = async () => {
    if (!resetToken) {
      showError(t('general.error'), t('login.otpRequired', 'Please enter the code'));
      return;
    }
    setResetLoading(true);

    // Verify OTP for recovery. This logs the user in if successful.
    const { error } = await supabase.auth.verifyOtp({
      email: resetEmail,
      token: resetToken,
      type: 'recovery',
    });

    setResetLoading(false);

    if (error) {
      showError(t('general.error'), t('login.invalidOtp', 'Invalid code, please try again'));
    } else {
      // Move to New Password step
      setForgotStep('password');
    }
  };

  // 4. Update Password
  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      showError(t('general.error'), t('login.passwordsRequired', 'Please fill both password fields'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showError(t('general.error'), t('login.passwordsNoMatch', 'Passwords do not match'));
      return;
    }

    setResetLoading(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setResetLoading(false);

    if (error) {
      showError(t('general.error'), error.message);
    } else {
      // Success! Close modal and maybe fill the login field
      setShowForgotModal(false);
      setPassword(''); // Clear old password input
      setEmail(resetEmail); // Ensure login email matches reset email
      // Optional: You could auto-login here or ask them to sign in again. 
      // Since verifyOtp logs them in, they are technically authenticated now.
      // If you want to force them to click "Sign In", you can sign them out:
      await supabase.auth.signOut(); 
      showError(t('general.success'), t('login.passwordUpdated', 'Password updated successfully. Please sign in.'));
    }
  };

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

        {/* Updated Forgot Password Button */}
        <Pressable onPress={initForgotPassword} style={styles.forgotPassword} disabled={loading}>
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

      {/* --- FORGOT PASSWORD MODAL --- */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            
            {/* Modal Title */}
            <Text style={[typography.h3, styles.modalTitle, { color: colors.text }]}>
              {forgotStep === 'email' && t('login.resetTitle', 'Reset Password')}
              {forgotStep === 'otp' && t('login.enterCode', 'Enter Code')}
              {forgotStep === 'password' && t('login.newPasswordTitle', 'Set New Password')}
            </Text>

            {/* STEP 1: Email Input */}
            {forgotStep === 'email' && (
              <>
                <Text style={[typography.body, { color: colors.subtext, marginBottom: 16, textAlign: 'center' }]}>
                  {t('login.resetInstructions', 'Enter your email to receive a recovery code.')}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="name@company.com"
                  placeholderTextColor={colors.subtext}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Pressable
                  style={[styles.button, { backgroundColor: colors.primary, marginTop: 10 }]}
                  onPress={handleSendResetEmail}
                  disabled={resetLoading}
                >
                   {resetLoading ? (
                    <ActivityIndicator color={colors.primaryText} />
                   ) : (
                    <Text style={[typography.button, { color: colors.primaryText }]}>{t('general.send', 'Send')}</Text>
                   )}
                </Pressable>
              </>
            )}

            {/* STEP 2: OTP Input */}
            {forgotStep === 'otp' && (
              <>
                <Text style={[typography.body, { color: colors.subtext, marginBottom: 16, textAlign: 'center' }]}>
                  {t('login.codeSentTo', 'We sent a code to')} {resetEmail}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, textAlign: 'center', letterSpacing: 5 }]}
                  placeholder="123456"
                  placeholderTextColor={colors.subtext}
                  value={resetToken}
                  onChangeText={setResetToken}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                 <Pressable
                  style={[styles.button, { backgroundColor: colors.selector, marginTop: 10 }]}
                  onPress={handleVerifyOtp}
                  disabled={resetLoading}
                >
                   {resetLoading ? (
                    <ActivityIndicator color={colors.primaryText} />
                   ) : (
                    <Text style={[typography.button, { color: colors.primaryText }]}>{t('general.verify', 'Verify')}</Text>
                   )}
                </Pressable>
                <TouchableOpacity onPress={() => setForgotStep('email')} style={{ marginTop: 15 }}>
                    <Text style={[typography.caption, { color: colors.primary, textAlign: 'center' }]}>{t('login.wrongEmail', 'Change email')}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* STEP 3: New Password Inputs */}
            {forgotStep === 'password' && (
              <>
                <Text style={[typography.body, { color: colors.subtext, marginBottom: 16, textAlign: 'center' }]}>
                  {t('login.createSafePassword', 'Create a new secure password.')}
                </Text>

                {/* New Password */}
                <View style={[styles.passwordContainer, { backgroundColor: colors.background, borderColor: colors.border, marginBottom: 12 }]}>
                    <TextInput
                        style={[styles.passwordInput, { color: colors.text }]}
                        placeholder={t('login.newPassword', 'New Password')}
                        placeholderTextColor={colors.subtext}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity 
                        style={styles.eyeIcon} 
                        onPress={() => setShowNewPassword(!showNewPassword)}
                    >
                        <Feather name={showNewPassword ? "eye" : "eye-off"} size={20} color={colors.subtext} />
                    </TouchableOpacity>
                </View>

                {/* Confirm Password */}
                <View style={[styles.passwordContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <TextInput
                        style={[styles.passwordInput, { color: colors.text }]}
                        placeholder={t('login.reInputPassword', 'Re-enter Password')}
                        placeholderTextColor={colors.subtext}
                        value={confirmNewPassword}
                        onChangeText={setConfirmNewPassword}
                        secureTextEntry={!showConfirmNewPassword}
                    />
                    <TouchableOpacity 
                        style={styles.eyeIcon} 
                        onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    >
                        <Feather name={showConfirmNewPassword ? "eye" : "eye-off"} size={20} color={colors.subtext} />
                    </TouchableOpacity>
                </View>

                <Pressable
                  style={[styles.button, { backgroundColor: colors.primary, marginTop: 20 }]}
                  onPress={handleUpdatePassword}
                  disabled={resetLoading}
                >
                   {resetLoading ? (
                    <ActivityIndicator color={colors.primaryText} />
                   ) : (
                    <Text style={[typography.button, { color: colors.primaryText }]}>{t('general.accept', 'Accept')}</Text>
                   )}
                </Pressable>
              </>
            )}

            {/* Cancel Button (Always visible unless loading) */}
            <Pressable 
                style={styles.cancelBtn} 
                onPress={() => setShowForgotModal(false)}
                disabled={resetLoading}
            >
              <Text style={{ color: colors.subtext }}>{t('general.cancel', 'Cancel')}</Text>
            </Pressable>

          </View>
        </View>
      </Modal>

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
  divider: { height: 1, width: '100%', opacity: 0.5 },
  // Modal Styles (Adapted from provided export modal)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 16, padding: 24, borderWidth: 1, maxWidth: 400 },
  modalTitle: { textAlign: 'center', marginBottom: 20 },
  cancelBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
});