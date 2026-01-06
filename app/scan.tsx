import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { showError } from '../lib/toast';
import { typography } from '../styles/typography';

export default function ScanScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme(); 
  const router = useRouter();

  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);

  // --- ACTIONS ---

  const handleManualScan = async () => {
    // 1. Validation
    if (!barcode.trim()) {
      showError(t('general.error'), t('scan.enterNum')); 
      return;
    }

    setLoading(true);
    Keyboard.dismiss(); 

    try {
      // 2. Database Lookup
      const { data: item, error } = await supabase
        .from('items')
        .select('id')
        .eq('barcode', barcode.trim())
        .single();

      // Handle actual DB errors (ignoring 'Item not found' code PGRST116)
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (item) {
        // 3a. Item Exists -> Edit
        router.push(`/edit-item/${item.id}`);
      } else {
        // 3b. Item New -> Add (via Location Select)
        router.push({ 
          pathname: '/select-location-modal', 
          params: { barcode: barcode.trim() } 
        });
      }

    } catch (error: any) {
      console.error(error);
      showError(t('general.error'), error.message || t('general.errorOccurred'));
      setLoading(false); 
    }
    // Note: If success, we don't set loading(false) to prevent UI flicker during navigation
  };

  // Prevent render if theme not ready
  if (!colors) return <View style={{flex:1}} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            
            {/* HERO / ICON SECTION */}
            <View style={styles.heroSection}>
              <View style={[styles.iconCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <FontAwesome name="barcode" size={40} color={colors.primary} />
              </View>
              <Text style={[typography.h1, styles.title, { color: colors.text }]}>
                {t('scan.manualEntryTitle', 'Scan Item')}
              </Text>
              <Text style={[typography.body, styles.subtitle, { color: colors.subtext || colors.text }]}>
                {t('scan.manualEntrySub', 'Enter a barcode number to search or add an item.')}
              </Text>
            </View>

            {/* INPUT SECTION (Styled like Settings Card) */}
            <View style={styles.section}>
              <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>
                {t('scan.inputLabel', 'Manual Entry')}
              </Text>
              
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.inputRow}>
                   <TextInput
                    style={[
                      typography.body, 
                      styles.input, 
                      { color: colors.text }
                    ]}
                    placeholder={t('scan.enterNum', 'e.g. 123456789')}
                    placeholderTextColor={colors.subtext || '#888'}
                    value={barcode}
                    onChangeText={setBarcode}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={handleManualScan}
                    editable={!loading}
                    autoFocus={false}
                  />
                  {/* Clear Button */}
                  {barcode.length > 0 && (
                    <Pressable onPress={() => setBarcode('')} style={{ padding: 8 }}>
                      <FontAwesome name="times-circle" size={16} color={colors.subtext || '#888'} />
                    </Pressable>
                  )}
                </View>
              </View>
            </Pressable>
            
            {/* ACTION BUTTON (Styled like Settings Logout/Danger button) */}
            <View style={styles.section}>
              <Pressable 
                style={[
                  styles.actionButton, 
                  { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }
                ]} 
                onPress={handleManualScan} 
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[typography.button, { color: '#fff' }]}>
                      {t('scan.submitBarcode', 'Search Item')}
                    </Text>
                    <FontAwesome name="arrow-right" size={14} color="#fff" />
                  </View>
                )}
              </Pressable>
            </View>

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center', // Centers content vertically like a prompt screen
  },
  
  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: '80%',
    opacity: 0.7,
  },

  // Sections (Matches Settings)
  section: {
    marginBottom: 24,
    width: '100%',
  },
  sectionTitle: { 
    marginBottom: 8, 
    fontSize: 13, 
    textTransform: 'uppercase', 
    opacity: 0.7 
  },
  
  // Card / Input (Matches Settings)
  card: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4, // Input has its own padding
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },

  // Buttons
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});