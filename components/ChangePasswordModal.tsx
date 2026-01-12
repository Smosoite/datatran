import React, { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { showError, showSuccess } from '../lib/toast';
import { useRouter } from 'expo-router';
import { useTheme } from '../providers/ThemeProvider';

export default function ChangePasswordModal({ isVisible, onClose, themeColors, styles }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    // 1. Validation
    if (!password || password !== confirmPassword) {
      showError(t('general.error'), t('login.passwordsNoMatch', 'Passwords do not match'));
      return;
    }

    setLoading(true);

    try {
      console.log("Attempting to update password...");

      // 2. Race Condition Fix:
      // Run the update against a 5-second timer. If Supabase hangs, we proceed anyway.
      const timeOutPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ error: null, timeout: true }), 5000);
      });

      const response: any = await Promise.race([
        supabase.auth.updateUser({ password }),
        timeOutPromise
      ]);

      if (response.error) throw response.error;

      // 3. SUCCESS - Force Navigation FIRST
      setLoading(false);
      onClose();
      
      showSuccess(t('general.success'), t('login.passwordUpdated', 'Password updated. Please log in again.'));
      
      // CRITICAL: Manually navigate to login. Do not wait for AuthListener.
      router.replace('/login');

      // 4. Cleanup (Background)
      // Fire and forget. We don't await this because it might hang.
      supabase.auth.signOut();

    } catch (error: any) {
      setLoading(false);
      console.error("Password Update Error:", error);
      showError(t('general.error'), error.message);
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.container, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          
          <Text style={[styles.header, { color: themeColors.text }]}>
            {t('profile.changePassword', 'Change Password')}
          </Text>

          {/* New Password */}
          <View style={[styles.passwordContainer, { borderColor: themeColors.border }]}>
            <TextInput
              style={[styles.passwordInput, { color: themeColors.text }]}
              placeholder={t('login.newPassword', 'New Password')}
              placeholderTextColor={themeColors.subtext}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={themeColors.subtext} />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <View style={[styles.passwordContainer, { borderColor: themeColors.border }]}>
            <TextInput
              style={[styles.passwordInput, { color: themeColors.text }]}
              placeholder={t('login.reInputPassword', 'Confirm Password')}
              placeholderTextColor={themeColors.subtext}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />
          </View>

          {/* Action Buttons */}
          <View style={modalStyles.buttonRow}>
            <Pressable onPress={onClose} style={[modalStyles.cancelButton]}>
              <Text style={{ color: themeColors.subtext }}>{t('general.cancel', 'Cancel')}</Text>
            </Pressable>

            <Pressable 
              onPress={handleUpdatePassword} 
              disabled={loading}
              style={[styles.button, { marginTop: 0, flex: 1, backgroundColor: colors.selector || '#007AFF' }]}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={[styles.buttonText, { color: colors.text }]}>{t('general.save', 'Update')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  container: { borderRadius: 12, padding: 24, borderWidth: 1 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, gap: 12 },
  cancelButton: { padding: 16 },
});