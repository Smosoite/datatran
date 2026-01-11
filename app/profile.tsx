import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';
import { Feather } from '@expo/vector-icons'; // Added for the Eye icon

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { profile, refreshProfile } = useAuth();
  
  const [username, setUsername] = useState(profile?.username || '');
  
  // Password States
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async () => {
    // 1. Validation
    if (!username.trim()) {
      showError(t('general.error'), t('profile.noUserName', 'Username is required'));
      return;
    }

    setLoading(true);
    try {
      // 2. Update Username (Public Profile)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', profile?.id);
      
      if (profileError) throw profileError;

      // 3. Update Password (Auth) - Only if field is filled
      if (password) {
        if (password !== confirmPassword) {
          showError(t('general.error'), t('login.passwordsNoMatch', 'Passwords do not match'));
          setLoading(false);
          return;
        }
        
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) throw passwordError;
      }

      await refreshProfile(); 
      showSuccess(t('general.success'), t('profile.updateSuccess', 'Profile updated successfully'));
      router.back();

    } catch (error: any) {
      showError(t('general.error'), error.message);
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
      <Text style={[typography.h3, styles.header, { color: colors.text }]}>{t('profile.editHeader', 'Edit Profile')}</Text>

      {/* USERNAME INPUT */}
      <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('login.username', 'Username')}</Text>
      <TextInput
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      
      {/* PASSWORD SECTION */}
      <Text style={[typography.body, styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
        {t('profile.changePassword', 'Change Password')}
      </Text>

      {/* New Password Field */}
      <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('login.newPassword', 'New Password')}</Text>
      <View style={[styles.passwordContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
            style={[styles.passwordInput, { color: colors.text }]}
            placeholder={t('login.newPassword', 'New Password')}
            placeholderTextColor={colors.subtext}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
        />
        <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={() => setShowPassword(!showPassword)}
        >
            <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={colors.subtext} />
        </TouchableOpacity>
      </View>

      {/* Confirm Password Field */}
      <Text style={[typography.body, styles.label, { color: colors.text }]}>{t('login.reInputPassword', 'Confirm Password')}</Text>
      <View style={[styles.passwordContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
            style={[styles.passwordInput, { color: colors.text }]}
            placeholder={t('login.reInputPassword', 'Confirm Password')}
            placeholderTextColor={colors.subtext}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
            <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={20} color={colors.subtext} />
        </TouchableOpacity>
      </View>
      
      {/* SAVE BUTTON */}
      <Pressable style={[styles.button, { backgroundColor: colors.primary || colors.selector }]} onPress={handleUpdateProfile} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.primaryText || '#fff'} />
        ) : (
          <Text style={[typography.button, styles.buttonText, { color: colors.primaryText || '#fff' }]}>{t('general.save', 'Save Changes')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: { padding: 24 },
  header: { fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  sectionTitle: { fontWeight: '600', marginTop: 24, marginBottom: 16, borderBottomWidth: 1, paddingBottom: 8 },
  label: { marginBottom: 8, fontWeight: '500' },
  
  // Standard Input
  input: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 16 },
  
  // Password Input (Flex Row Container)
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, marginBottom: 16 },
  passwordInput: { flex: 1, padding: 16 },
  eyeIcon: { padding: 16 },

  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  buttonText: { fontWeight: 'bold' },
});