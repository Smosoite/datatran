import { useTranslation } from 'react-i18next';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, ScrollView, ActivityIndicator, Alert } from 'react-native';
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

  // --- ACTIONS ---

  const handleChangePasscode = useCallback(() => {
    const performUpdate = async (newCode: string) => {
      try {
        const { error } = await supabase
          .from('workgroups')
          .update({ passcode: newCode })
          .eq('id', workgroup?.id);

        if (error) throw error;
        await refreshProfile();
        showSuccess(t('general.success'), t('settings.passcodeSet'));
      } catch (err: any) {
        showError(t('general.error'), err.message);
      }
    };

    const promptForNewCode = () => {
      setTimeout(() => {
        showPasscodeModal({
          title: t('settings.enterNewPasscode', 'Enter New Passcode'),
          message: '',
          onSubmit: (newCode) => performUpdate(newCode)
        });
      }, 300);
    };

    if (workgroup?.passcode) {
      showPasscodeModal({
        title: t('settings.enterCurrentPasscode', 'Enter Current Passcode'),
        message: '',
        onSubmit: (inputCode) => {
          if (inputCode === workgroup.passcode) {
            promptForNewCode();
          } else {
            showError(t('general.error'), t('stockGrid.invalidPasscode'));
          }
        }
      });
    } else {
      promptForNewCode();
    }
  }, [workgroup, refreshProfile, t, showPasscodeModal]);

  const handleDeleteWorkgroup = useCallback(() => {
    const proceedToDelete = () => {
      setTimeout(() => {
        showConfirmation({
          title: t('settings.del', 'Delete Workgroup'),
          message: t('settings.warning', 'Are you sure? This cannot be undone.'),
          confirmText: t('settings.everything', 'Yes, Delete Everything'),
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
      }, 500);
    };

    if (workgroup?.passcode) {
      showPasscodeModal({
        title: t('stockGrid.passcodeTitle', 'Admin Passcode'),
        message: t('stockGrid.passcodeMessage', 'Required to delete workgroup'),
        onSubmit: (passcode) => {
          if (passcode === workgroup.passcode) {
            proceedToDelete();
          } else {
            showError(t('stockGrid.invalidPasscode'));
          }
        }
      });
    } else {
      proceedToDelete();
    }
  }, [workgroup, t, showConfirmation, showPasscodeModal]);

  const handleLogout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) showError(t('general.error'), error.message);
  }, [t]);

  const toggleMode = useCallback(() => {
    setMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, [setMode]);

  const handleExportData = useCallback(async () => {
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
  }, [t]);

  // Prevent rendering if theme context is not ready
  if (!colors) return <View style={{flex:1}} />;

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: colors.background }} 
      contentContainerStyle={styles.container}
      removeClippedSubviews={true} // Performance optimization
    >
      
      {/* APPEARANCE */}
      <View style={styles.section}>
        <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>{t('settings.appearance')}</Text>
        
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.appRow}>
            <Text style={[typography.button, styles.label, { color: colors.text }]}>{t('settings.dark')}</Text>
            <Switch
              trackColor={{ false: colors.background, true: colors.selector }}
              thumbColor={colors.primary}
              onValueChange={toggleMode}
              value={isDarkMode}
            />
          </View>
        </View>

        <View style={styles.themeGrid}>
          {themes.map(themeOption => (
            <Pressable
              key={themeOption.key}
              onPress={() => setTheme(themeOption.key as any)}
              style={[
                styles.themeButton,
                { 
                  backgroundColor: theme === themeOption.key ? colors.selector : colors.card,
                  borderColor: themeOption.representativeColor,
                  borderWidth: 2
                }
              ]}
            >
              <Text style={[
                  typography.button, 
                  { color: colors.text, textAlign: 'center', fontSize: 12 }
              ]}>
                {t(`themes.${themeOption.key}`, themeOption.name)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ACCOUNT */}
      <View style={styles.section}>
        <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>{t('settings.account')}</Text>
        <Pressable 
          style={[styles.card, styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border }]} 
          onPress={() => router.push('/profile')}
        >
          <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>{t('settings.manageProfile')}</Text>
          <FontAwesome name="chevron-right" size={14} color={colors.subtext} />
        </Pressable>
      </View>

      {/* GROUP INFO */}
      <View style={styles.section}>
        <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>{t('settings.groupInfo')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[typography.button, styles.label, { color: colors.text }]}>{t('settings.workgroupName')}</Text>
            <Text style={[typography.button, styles.value, { color: colors.primary }]}>{workgroup?.name || '...'}</Text>
          </View>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={[typography.button, styles.label, { color: colors.text }]}>{t('settings.code')}</Text>
            <Text style={[typography.button, styles.value, { color: colors.primary }]}>{workgroup?.passcode || '...'}</Text>
          </View>
        </View>
      </View>

      {/* ADMIN SECURITY */}
      {profile?.role === 'admin' && (
        <View style={styles.section}>
           <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>{t('settings.security')}</Text>
           
           <View style={{ gap: 8 }}>
             <Pressable 
               style={[styles.card, styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border }]} 
               onPress={() => router.push('/history')}
             >
               <View style={{flexDirection:'row', alignItems:'center'}}>
                 <FontAwesome name="history" size={18} color={colors.primary} />
                 <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>{t('settings.history')}</Text>
               </View>
               <FontAwesome name="chevron-right" size={14} color={colors.subtext} />
             </Pressable> 

             <Pressable 
               style={[styles.card, styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border }]} 
               onPress={handleChangePasscode}
             >
               <View style={{flexDirection:'row', alignItems:'center'}}>
                 <FontAwesome name="lock" size={18} color={colors.primary} />
                 <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>{t('settings.changePasscode')}</Text>
               </View>
               <FontAwesome name="chevron-right" size={14} color={colors.subtext} />
             </Pressable>

             <Pressable 
               style={[styles.card, styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border }]} 
               onPress={() => router.push('/manage-members')}
             >
               <View style={{flexDirection:'row', alignItems:'center'}}>
                 <FontAwesome name="users" size={18} color={colors.primary} />
                 <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>{t('settings.members')}</Text>
               </View>
               <FontAwesome name="chevron-right" size={14} color={colors.subtext} />
             </Pressable>
           </View>
        </View>
      )}

      {/* LANGUAGE */}
      <View style={styles.section}>
        <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>{t('settings.language')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', padding: 10, gap: 10 }]}>
          <Pressable 
            style={[styles.langButton, i18n.language === 'en' && { backgroundColor: colors.selector }]} 
            onPress={() => i18n.changeLanguage('en')}
          >
            <Text style={[typography.button, { color: colors.text }]}>{t('settings.english')}</Text>
          </Pressable>
          <Pressable 
            style={[styles.langButton, i18n.language === 'fi' && { backgroundColor: colors.selector }]} 
            onPress={() => i18n.changeLanguage('fi')}
          >
            <Text style={[typography.button, { color: colors.text }]}>{t('settings.finnish')}</Text>
          </Pressable>
        </View>
      </View>

      {/* DATA EXPORT */}
      <View style={styles.section}>
        <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>{t('settings.data')}</Text>
        <Pressable 
          style={[styles.card, styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border }, isExporting && { opacity: 0.6 }]} 
          onPress={handleExportData} 
          disabled={isExporting}
        >
          <View style={{flexDirection:'row', alignItems:'center'}}>
            {isExporting ? <ActivityIndicator color={colors.primary} /> : <FontAwesome name="download" size={18} color={colors.primary} /> }
            <Text style={[typography.button, styles.menuButtonText, { color: colors.primary }]}>
              {isExporting ? t('settings.expo') : t('settings.expoAll')}
            </Text>
          </View>
        </Pressable>
      </View>
      
      {/* DELETE & LOGOUT */}
      <View style={[styles.section, { marginTop: 20, marginBottom: 50 }]}>
        {profile?.role === 'admin' && (
          <Pressable 
            style={[styles.dangerButton, { backgroundColor: colors.card, borderColor: colors.danger }]} 
            onPress={handleDeleteWorkgroup}
          >
            <Text style={[typography.button, { color: colors.danger }]}>{t('settings.del')}</Text>
          </Pressable>
        )}

        <Pressable style={[styles.logoutButton, { backgroundColor: colors.selector }]} onPress={handleLogout}>
          <Text style={[typography.button, { color: colors.text }]}>{t('settings.logout')}</Text>
        </Pressable>
      </View>
        
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 50 },
  section: { marginBottom: 24 },
  sectionTitle: { marginBottom: 8, fontSize: 13, textTransform: 'uppercase', opacity: 0.7 },
  card: { borderRadius: 12, paddingHorizontal: 16, borderWidth: 1 },
  
  // Rows
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  appRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  
  // Text
  label: { fontSize: 15 },
  value: { fontSize: 15 },
  
  // Buttons
  menuButton: { paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuButtonText: { marginLeft: 12, fontSize: 15 },
  
  // Theme Grid
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  themeButton: { 
    width: '30%', // Percentage width is faster and safer than Dimensions calculation
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  // Language
  langButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  
  // Footer Actions
  dangerButton: { borderWidth: 1, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  logoutButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
});