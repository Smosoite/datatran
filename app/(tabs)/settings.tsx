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

// --- COPILOT IMPORTS ---
import { CopilotStep, walkthroughable, useCopilot } from "react-native-copilot";
import AsyncStorage from '@react-native-async-storage/async-storage';

const WalkableView = walkthroughable(View);
const WalkablePressable = walkthroughable(Pressable);

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
  const { profile, workgroup, refreshProfile } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  // --- COPILOT HOOK ---
  const { start: startTour } = useCopilot();

  // --- START TOUR ON MOUNT (ONCE) ---
  useEffect(() => {
    const checkFirstTime = async () => {
        try {
            const hasSeen = await AsyncStorage.getItem('HAS_SEEN_SETTINGS_TOUR');
            if (!hasSeen) {
                setTimeout(() => startTour(), 500);
                await AsyncStorage.setItem('HAS_SEEN_SETTINGS_TOUR', 'true');
            }
        } catch (e) { console.warn(e); }
    };
    checkFirstTime();
  }, []);

// ... inside SettingsScreen component
  
  const handleResetTours = async () => {
     try {
         const keys = [
             `HAS_SEEN_DASHBOARD_${profile?.id}`,
             `HAS_SEEN_WAREHOUSE_TOUR_${profile?.id}`,
             `HAS_SEEN_GRID_TOUR_${profile?.id}`,
             `HAS_SEEN_ADD_ITEM_TOUR_${profile?.id}`,
             // Add other keys as you implement them...
         ];
         
         // If you used the old keys (without ID), clear them too just in case
         const legacyKeys = [
             'HAS_SEEN_DASHBOARD_TOUR', 'HAS_SEEN_WAREHOUSE_TOUR', 
             'HAS_SEEN_GRID_TOUR', 'HAS_SEEN_ADD_ITEM_TOUR', 
             'HAS_SEEN_SETTINGS_TOUR', 'HAS_SEEN_HISTORY_TOUR'
         ];

         await AsyncStorage.multiRemove([...keys, ...legacyKeys]);
         
         showSuccess(t('general.success'), "Tours have been reset. Go to the dashboard to see them again.");
     } catch (e) {
         showError(t('general.error'), "Failed to reset tours.");
     }
  };
  
  // --- HANDLERS (Passcode, Dessete, Logout, Export) ---
  // (Logic kept identical to your provided code)
  
  const handleChangePasscode = () => {
    const performUpdate = async (newCode: string) => {
      try {
        const { error } = await supabase.from('workgroups').update({ admin_passcode: newCode }).eq('id', workgroup?.id);
        if (error) throw error;
        await refreshProfile(); 
        showSuccess(t('general.success'), t('settings.passcodeSet'));
      } catch (err: any) { showError(t('general.error'), err.message); }
    };

    const promptForNewCode = () => {
      setTimeout(() => {
        showPasscodeModal({ title: 'settings.enterNewPasscode', message: '', onSubmit: performUpdate });
      }, 300);
    };

    if (workgroup?.admin_passcode) {
      showPasscodeModal({
        title: 'settings.enterCurrentPasscode',
        message: '',
        onSubmit: (inputCode) => {
          if (inputCode === workgroup.admin_passcode) promptForNewCode();
          else showError(t('general.error'), t('stockGrid.invalidPasscode'));
        }
      });
    } else {
      promptForNewCode();
    }
  };

  const handleDeleteWorkgroup = () => {
    const proceedToDelete = () => {
      setTimeout(() => {
        showConfirmation({
          title: 'settings.del', message: t('settings.warning'), confirmText: 'settings.everything', isDestructive: true,
          onConfirm: async () => {
            try {
              const { error } = await supabase.rpc('delete_current_workgroup');
              if (error) throw error;
              showSuccess(t('general.groupDeleted'));
              await supabase.auth.signOut();
            } catch (err: any) { showError(err.message || "An unknown error occurred."); }
          },
        });
      }, workgroup?.admin_passcode ? 500 : 0);
    };

    if (workgroup?.admin_passcode) {
      showPasscodeModal({
        title: 'stockGrid.passcodeTitle', message: 'stockGrid.passcodeMessage',
        onSubmit: (passcode) => {
          if (passcode === workgroup.admin_passcode) proceedToDelete();
          else showError(t('stockGrid.invalidPasscode'));
        }
      });
    } else {
      proceedToDelete();
    }
  };
  
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) showError(t('general.error'), error.message);
  };

  const toggleMode = () => setMode(isDarkMode ? 'light' : 'dark');

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data: items, error } = await supabase.from('items').select(`name, quantity, cost, restock_threshold, barcode, warehouses ( name ), storages ( name ), defined_locations ( shelf, row, "column", container )`);
      if (error) throw error;
      if (!items || items.length === 0) { showError(t('general.noData'), t('general.noDataToExport')); return; }
      
      const formattedData = items.map(item => ({
        'Item Name': item.name, 'Quantity': item.quantity, 'Cost': item.cost, 'Barcode': item.barcode, 'Restock Threshold': item.restock_threshold,
        'Warehouse': item.warehouses?.name, 'Storage Unit': item.storages?.name, 'Shelf': item.defined_locations?.shelf, 'Row': item.defined_locations?.row,
        'Column': item.defined_locations?.column, 'Container': item.defined_locations?.container,
      }));

      const csvString = Papa.unparse(formattedData);
      const fileUri = FileSystem.documentDirectory + `inventory_export_${new Date().getTime()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri);
    } catch (error: any) { showError(t('general.error'), t('general.exportError', { message: error.message })); } finally { setIsExporting(false); }
  };
  
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      
      {/* STEP 1: Appearance */}
      <CopilotStep text= {t('pilot.custom')} order={1} name="appearance">
        <WalkableView style={styles.section} collapsable={false}>
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
                <Text style={[typography.button, typography.shadow, styles.themeButtonText, { color: colors.text, textShadowColor: colors.textShadow }]}>
                    {t(`themes.${themeOption.key}`)}
                </Text>
                </Pressable>
            ))}
            </View>
        </WalkableView>
      </CopilotStep>

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

      {/* STEP 2: Security (Admin Only) */}
      {profile?.role === 'admin' && (
        <CopilotStep text= {t('pilot.history')} order={2} name="securitySection">
            <WalkableView style={styles.section} collapsable={false}>
                <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>{t('settings.security')}</Text>
                <Pressable style={[styles.card, styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]} onPress={() => router.push('/history')}>
                    <FontAwesome name="history" size={20} color={colors.primary} />
                    <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>{t('settings.history')}</Text>
                </Pressable> 
                <Pressable style={[styles.card, styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]} onPress={handleChangePasscode}>
                    <FontAwesome name="lock" size={20} color={colors.primary} />
                    <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>{t('settings.changePasscode')}</Text>
                </Pressable>
                <Pressable style={[styles.card, styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]} onPress={() => router.push('/manage-members')}>
                    <FontAwesome name="users" size={20} color={colors.primary} />
                    <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>{t('settings.members')}</Text>
                </Pressable>
            </WalkableView>
        </CopilotStep>
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

      {/* STEP 3: Export */}
      <CopilotStep text= {t('pilot.export')} order={3} name="dataExport">
        <WalkableView style={styles.section}>
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
        </WalkableView>
      </CopilotStep>
      
      {profile?.role === 'admin' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}></Text>
          <Pressable style={[styles.deleteButton, { backgroundColor: colors.card, borderColor: colors.danger }]} onPress={handleDeleteWorkgroup}>
            <Text style={[typography.button, styles.deleteButtonText, { color: colors.danger }]}>{t('settings.del')}</Text>
          </Pressable>
        </View>
      )}
{/* Add this near the bottom of your settings scrollview */}
      <View style={styles.section}>
        <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>Development</Text>
        <Pressable 
            style={[styles.card, styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border }]} 
            onPress={handleResetTours}
        >
          <FontAwesome name="refresh" size={20} color={colors.primary} />
          <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>Reset Onboarding Tours</Text>
        </Pressable>
      </View>
      
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
  label: {  },
  value: {  },
  menuButton: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', },
  menuButtonText: { marginLeft: 8 },
  logoutButton: { padding: 16, borderRadius: 16, alignItems: 'center' },
  logoutButtonText: {  },
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