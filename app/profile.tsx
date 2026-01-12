import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';
// Import the new modal
import ChangePasswordModal from '../components/ChangePasswordModal';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { profile, refreshProfile } = useAuth();
  
  const [username, setUsername] = useState(profile?.username || '');
  const [loading, setLoading] = useState(false);
  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);

  // This function ONLY handles profile data (Username)
  const handleUpdateProfile = async () => {
    if (!username.trim()) {
      showError(t('general.error'), t('profile.noUserName', 'Username is required'));
      return;
    }

    // Nothing changed? Just go back.
    if (username === profile?.username) {
      router.back();
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', profile?.id);

      if (error) throw error;

      await refreshProfile();
      setLoading(false);
      showSuccess(t('general.success'), t('profile.updateSuccess', 'Profile updated successfully'));
      router.back();

    } catch (error: any) {
      setLoading(false);
      showError(t('general.error'), error.message);
    }
  };

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: colors.background }} 
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[typography.h3, styles.header, { color: colors.text }]}>
        {t('profile.editHeader', 'Edit Profile')}
      </Text>

      {/* USERNAME INPUT */}
      <Text style={[typography.body, styles.label, { color: colors.text }]}>
        {t('login.username', 'Username')}
      </Text>
      <TextInput
        style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      
      {/* CHANGE PASSWORD BUTTON */}
      <Pressable 
        style={[styles.outlineButton, { borderColor: colors.border }]} 
        onPress={() => setPasswordModalVisible(true)}
      >
        <Text style={[typography.body, { color: colors.text }]}>
            {t('profile.changePassword', 'Change Password')}
        </Text>
      </Pressable>
      
      {/* SAVE BUTTON (Only for Profile info) */}
      <Pressable 
        style={[styles.button, { backgroundColor: colors.primary || '#007AFF' }]} 
        onPress={handleUpdateProfile} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.primaryText || '#fff'} />
        ) : (
          <Text style={[typography.button, styles.buttonText, { color: colors.selector || '#fff' }]}>
            {t('general.save1', 'Save Changes')}
          </Text>
        )}
      </Pressable>

      {/* The Modal lives here, but is hidden by default */}
      <ChangePasswordModal 
        isVisible={isPasswordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
        themeColors={colors}
        styles={styles} 
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: { padding: 24 },
  header: { fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  label: { marginBottom: 8, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 24 },
  
  // Reused in Modal
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, marginBottom: 16 },
  passwordInput: { flex: 1, padding: 16 },
  eyeIcon: { padding: 16 },

  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  outlineButton: { padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 24, borderWidth: 1 },
  buttonText: { fontWeight: 'bold' },
});