App/(tabs)/settings.tsx
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeProvider';
import { showError, showSuccess } from '../../lib/toast';
import { useModal } from '../../providers/ModalProvider';
import { typography } from '../../styles/typography';

const { width } = Dimensions.get('window');
const buttonMargin = 8;
const containerPadding = 24;
const cardHorizontalPadding = 24;
const themeButtonWidth = (width - (containerPadding * 2) - (cardHorizontalPadding * 2) - (buttonMargin * 4)) / 3;

const themes = [
  { key: 'default', name: 'Default', representativeColor: '#10567A' },
  { key: 'industrial', name: 'Industrial', representativeColor: '#C9C9C9' },
  { key: 'forest', name: 'Forest', representativeColor: '#064D06' },
  { key: 'cherryblossom', name: 'Blossom', representativeColor: '#EBC7D4' },
  { key: 'sunflower', name: 'Sunflower', representativeColor: '#FFEA00' },
  { key: 'sunset', name: 'Sunset', representativeColor: '#D93000' },
];

export default function SettingsScreen() {
  const { mode, setMode, theme, setTheme, colors } = useTheme();
  const isDarkMode = mode === 'dark';

  const { t, i18n } = useTranslation();
  const { showConfirmation, showPasscodeModal } = useModal();
  const router = useRouter();
  const { profile, workgroup, refreshProfile } = useAuth(); // Added workgroup & refreshProfile
  const [isExporting, setIsExporting] = useState(false);

// --- NEW: Handle Passcode Change/Creation ---
  const handleChangePasscode = () => {
    
    // Helper function to perform the DB update and state refresh
    const performUpdate = async (newCode: string) => {
      try {
        // 1. Update Supabase
        const { error } = await supabase
          .from('workgroups')
          .update({ admin_passcode: newCode })
          .eq('id', workgroup?.id);

        if (error) throw error;
        
        // 2. Refresh local state (This will now work without crashing because of the AuthProvider fix)
        await refreshProfile(); 
        
        // 3. Show success
        showSuccess(t('general.success'), t('settings.passcodeSet'));
      } catch (err: any) {
        showError(t('general.error'), err.message);
      }
    };

    const promptForNewCode = () => {
      // Small delay ensures the previous modal is fully closed visually
      setTimeout(() => {
        showPasscodeModal({
          title: 'settings.enterNewPasscode',
          message: '', 
          onSubmit: (newCode) => performUpdate(newCode)
        });
      }, 300);
    };

    // Logic: If code exists, verify old one first. If not, just set new one.
    if (workgroup?.admin_passcode) {
      showPasscodeModal({
        title: 'settings.enterCurrentPasscode',
        message: '',
        onSubmit: (inputCode) => {
          // Important: Compare inputCode to workgroup.admin_passcode
          if (inputCode === workgroup.admin_passcode) {
            promptForNewCode();
          } else {
            showError(t('general.error'), t('stockGrid.invalidPasscode'));
          }
        }
      });
    } else {
      promptForNewCode();
    }
  };

  // --- MODIFIED: Secured Delete Workgroup ---
  const handleDeleteWorkgroup = () => {
    const proceedToDelete = () => {
      // Add a small delay if coming from passcode modal
      setTimeout(() => {
        showConfirmation({
          title: 'settings.del',
          message: t('settings.warning'),
          confirmText: 'settings.everything',
          isDestructive: true,
          onConfirm: async () => {
            try {
              const { error } = await supabase.rpc('delete_current_workgroup');
              if (error) throw error;
              showSuccess(t('general.groupDeleted'));
              await supabase.auth.signOut();
            } catch (err: any) {
              showError(err.message || "An unknown error occurred.");
            }
          },
        });
      }, workgroup?.admin_passcode ? 500 : 0);
    };

    // If a passcode is set, require it before showing the delete confirmation
    if (workgroup?.admin_passcode) {
      showPasscodeModal({
        title: 'stockGrid.passcodeTitle',
        message: 'stockGrid.passcodeMessage',
        onSubmit: (passcode) => {
          if (passcode === workgroup.admin_passcode) {
            proceedToDelete();
          } else {
            showError(t('stockGrid.invalidPasscode'));
          }
        }
      });
    } else {
      // If no passcode is set, proceed directly (legacy behavior)
      proceedToDelete();
    }
  };
  
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError(t('general.error'), error.message);
    }
  };

  const toggleMode = () => {
    setMode(isDarkMode ? 'light' : 'dark');
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data: items, error } = await supabase
        .from('items')
        .select(`name, quantity, cost, restock_threshold, barcode, warehouses ( name ), storages ( name ), defined_locations ( shelf, row, "column", container )`);

      if (error) throw error;
      if (!items || items.length === 0) {
        showError(t('general.noData'), t('general.noDataToExport'));
        return;
      }
      
      const formattedData = items.map(item => ({
        'Item Name': item.name, 'Quantity': item.quantity, 'Cost': item.cost,
        'Barcode': item.barcode, 'Restock Threshold': item.restock_threshold,
        'Warehouse': item.warehouses?.name, 'Storage Unit': item.storages?.name,
        'Shelf': item.defined_locations?.shelf, 'Row': item.defined_locations?.row,
        'Column': item.defined_locations?.column, 'Container': item.defined_locations?.container,
      }));

      const csvString = Papa.unparse(formattedData);
      const filename = `inventory_export_${new Date().getTime()}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri);
    } catch (error: any) {
      showError(t('general.error'), t('general.exportError', { message: error.message }));
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      
      <View style={styles.section}>
        <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>{t('settings.appearance')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.appRow}>
            <Text style={[typography.button, styles.label, { color: colors.text }]}>{t('settings.dark')}</Text>
            <Switch
              trackColor={{ false: colors.background, true: colors.background }}
              thumbColor={colors.selector}
              onValueChange={toggleMode}
              value={isDarkMode}
            />
          </View>
        </View>

        <View style={[styles.card, styles.themeButtonsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {themes.map(themeOption => (
            <Pressable
              key={themeOption.key}
              onPress={() => setTheme(themeOption.key as any)}
              style={[
                styles.themeButton,
                { width: themeButtonWidth, borderWidth: 2, borderColor: themeOption.representativeColor },
                theme === themeOption.key && { backgroundColor: colors.selector }
              ]}
            >
              <Text
                style={[
                  typography.button, typography.shadow,
                  styles.themeButtonText,
                  { color: colors.text, textShadowColor: colors.textShadow }
                ]}
              >
                {t(`themes.${themeOption.key}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>{t('settings.account')}</Text>
        <Pressable style={[styles.card, styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/profile')}>
          <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>{t('settings.manageProfile')}</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>{t('settings.groupInfo')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[typography.button, typography.shadow, styles.label, { color: colors.text, textShadowColor: colors.textShadow }]}>{t('settings.workgroupName')}</Text>
            <Text style={[typography.button, styles.value, { color: colors.primary }]}>{workgroup?.name || '...'}</Text>
          </View>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={[typography.button, styles.label, { color: colors.text }]}>{t('settings.code')}</Text>
            <Text style={[typography.button, styles.value, { color: colors.primary }]}>{workgroup?.join_code || '...'}</Text>
          </View>
        </View>
      </View>

      {/* --- NEW: Security Section (Admin Only) --- */}
      {profile?.role === 'admin' && (
        <View style={styles.section}>
           <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>{t('settings.security')}</Text>
          <Pressable 
             style={[styles.card, styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]} 
             onPress={() => router.push('/history')}
           >
             <FontAwesome name="history" size={20} color={colors.primary} />
             <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>
               {t('settings.history')}
             </Text>
           </Pressable> 
          <Pressable 
             style={[styles.card, styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]} 
             onPress={handleChangePasscode}
           >
             <FontAwesome name="lock" size={20} color={colors.primary} />
             <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>
               {t('settings.changePasscode')}
             </Text>
           </Pressable>
          <Pressable 
             style={[styles.card, styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]} 
             onPress={() => router.push('/manage-members')}
           >
             <FontAwesome name="users" size={20} color={colors.primary} />
             <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>
               {t('settings.members')}
             </Text>
           </Pressable>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>{t('settings.language')}</Text>
        <View style={[typography.body, styles.card, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-around', padding: 10 }]}>
          <Pressable style={[styles.themeButton, {width: themeButtonWidth}, i18n.language === 'en' && { backgroundColor: colors.selector }]} onPress={() => i18n.changeLanguage('en')}>
            <Text style={[typography.button, typography.shadow, styles.themeButtonText, { color: colors.text, textShadowColor: colors.textShadow }]}>{t('settings.english')}</Text>
          </Pressable>
          <Pressable style={[styles.themeButton, {width: themeButtonWidth}, i18n.language === 'fi' && { backgroundColor: colors.selector }]} onPress={() => i18n.changeLanguage('fi')}>
            <Text style={[typography.button, typography.shadow, styles.themeButtonText, { color: colors.text, textShadowColor: colors.textShadow }]}>{t('settings.finnish')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>{t('settings.data')}</Text>
        <Pressable 
          style={[styles.card, styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border }, isExporting && styles.disabledButton]} 
          onPress={handleExportData} 
          disabled={isExporting}
        >
          {isExporting ? <ActivityIndicator color={colors.primary} style={{ marginRight: 10 }}/> : <FontAwesome name="download" size={16} color={colors.primary} /> }
          <Text style={[typography.button, styles.menuButtonText, { color: isExporting ? colors.subtext : colors.primary }]}>
            {isExporting ? t('settings.expo') : t('settings.expoAll')}
          </Text>
        </Pressable>
      </View>
      
      {profile?.role === 'admin' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}></Text>
          <Pressable 
            style={[styles.deleteButton, { backgroundColor: colors.card, borderColor: colors.danger }]} 
            onPress={handleDeleteWorkgroup}
          >
            <Text style={[typography.button, styles.deleteButtonText, { color: colors.danger }]}>{t('settings.del')}</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.section, { marginTop: 'auto' }]}>
        <Pressable style={[styles.logoutButton, { backgroundColor: colors.selector, borderColor: colors.border }]} onPress={handleLogout}>
          <Text style={[typography.button, typography.shadow, styles.logoutButtonText, { color: colors.text, textShadowColor: colors.textShadow }]}>{t('settings.logout')}</Text>
        </Pressable>
      </View>
        
    </ScrollView>
    
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  section: { marginBottom: 32 },
  sectionTitle: { marginBottom: 8 },
  card: { borderRadius: 16, paddingHorizontal: 24, borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  appRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  label: {  },
  value: {  },
  menuButton: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', },
  menuButtonText: { marginLeft: 8 },
  logoutButton: { padding: 16, borderRadius: 16, alignItems: 'center' },
  logoutButtonText: {  },
 themeButtonsContainer: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    paddingVertical: 10,
    gap: buttonMargin, 
  },
  themeButton: {
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: buttonMargin,
  },
  themeButtonText: {},
  deleteButton: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  disabledButton: { opacity: 0.5 },
  deleteButtonText: { },
});