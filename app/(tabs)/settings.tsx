import { useTranslation } from 'react-i18next';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print'; // <--- NEW IMPORT
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
          .update({ admin_passcode: newCode })
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

    if (workgroup?.admin_passcode) {
      showPasscodeModal({
        title: t('settings.enterCurrentPasscode', 'Enter Current Passcode'),
        message: '',
        onSubmit: (inputCode) => {
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

    if (workgroup?.admin_passcode) {
      showPasscodeModal({
        title: t('stockGrid.passcodeTitle', 'Admin Passcode'),
        message: t('stockGrid.passcodeMessage', 'Required to delete workgroup'),
        onSubmit: (passcode) => {
          if (passcode === workgroup.admin_passcode) {
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

  // --- EXPORT LOGIC ---

  const handleExportData = useCallback(async () => {
    setIsExporting(true);
    try {
      // 1. Select data including the new cost_per_unit field
      const { data: items, error } = await supabase
        .from('items')
        .select(`
          name, 
          quantity, 
          cost_per_unit, 
          barcode, 
          restock_threshold, 
          warehouses ( name ), 
          storages ( name ), 
          defined_locations ( shelf, row, "column", container )
        `);

      if (error) throw error;
      if (!items || items.length === 0) {
        showError(t('general.noData'), t('general.noDataToExport'));
        setIsExporting(false);
        return;
      }

      // 2. Calculations
      // Placeholder for tax rate - you said you will add a button for this later
      const TAX_RATE = 0.24; // Example: 24%
      
      let subtotal = 0;

      const formattedData = items.map(item => {
        const qty = item.quantity || 0;
        const cost = item.cost_per_unit || 0;
        const totalItemCost = qty * cost;
        
        subtotal += totalItemCost;

        return {
          name: item.name,
          quantity: qty,
          costPerUnit: cost,
          totalCost: totalItemCost, // Line item total
          barcode: item.barcode,
          restock: item.restock_threshold,
          warehouse: item.warehouses?.name || '',
          storage: item.storages?.name || '',
          location: `${item.defined_locations?.shelf || ''} ${item.defined_locations?.row || ''}`,
        };
      });

      const taxAmount = subtotal * TAX_RATE;
      const totalWithTax = subtotal + taxAmount;

      // 3. Ask User for Format
      Alert.alert(
        t('settings.exportFormatTitle', 'Choose Export Format'),
        t('settings.exportFormatMessage', 'Select how you want to view the inventory report.'),
        [
          {
            text: 'CSV',
            onPress: () => generateCSV(formattedData, subtotal, taxAmount, totalWithTax, TAX_RATE)
          },
          {
            text: 'PDF',
            onPress: () => generatePDF(formattedData, subtotal, taxAmount, totalWithTax, TAX_RATE)
          },
          {
            text: t('general.cancel', 'Cancel'),
            style: 'cancel',
            onPress: () => setIsExporting(false)
          }
        ]
      );

    } catch (error: any) {
      showError(t('general.error'), t('general.exportError', { message: error.message }));
      setIsExporting(false);
    }
  }, [t]);

  // --- CSV GENERATOR ---
  const generateCSV = async (data: any[], subtotal: number, taxAmount: number, totalWithTax: number, taxRate: number) => {
    try {
      // Format rows for CSV
      const csvRows = data.map(item => ({
        [t('export.itemName', 'Item Name')]: item.name,
        [t('export.quantity', 'Quantity')]: item.quantity,
        [t('export.costPerUnit', 'Cost Per Unit')]: item.costPerUnit.toFixed(2),
        [t('export.totalCost', 'Total Item Cost')]: item.totalCost.toFixed(2),
        [t('export.warehouse', 'Warehouse')]: item.warehouse,
        [t('export.location', 'Location')]: item.location,
      }));

      // Append Summary Rows at the bottom
      // We add empty strings for other columns to keep CSV structure valid-ish
      csvRows.push({}); // Empty row
      csvRows.push({ [t('export.itemName')]: '--- SUMMARY ---' });
      csvRows.push({ 
        [t('export.itemName')]: t('export.subtotal', 'Total (Excl. Tax)'), 
        [t('export.quantity')]: subtotal.toFixed(2) 
      });
      csvRows.push({ 
        [t('export.itemName')]: t('export.taxAmount', 'Tax Amount ({{rate}}%)', { rate: taxRate * 100 }), 
        [t('export.quantity')]: taxAmount.toFixed(2) 
      });
      csvRows.push({ 
        [t('export.itemName')]: t('export.totalWithTax', 'Total (Incl. Tax)'), 
        [t('export.quantity')]: totalWithTax.toFixed(2) 
      });

      const csvString = Papa.unparse(csvRows);
      const filename = `inventory_export_${new Date().getTime()}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri);
    } catch (e: any) {
      showError(t('general.error'), e.message);
    } finally {
      setIsExporting(false);
    }
  };

  // --- PDF GENERATOR ---
  const generatePDF = async (data: any[], subtotal: number, taxAmount: number, totalWithTax: number, taxRate: number) => {
    try {
      const rowsHtml = data.map(item => `
        <tr>
          <td>${item.name}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">${item.costPerUnit.toFixed(2)}</td>
          <td style="text-align: right;">${item.totalCost.toFixed(2)}</td>
          <td>${item.warehouse}</td>
        </tr>
      `).join('');

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; }
              h1 { color: #10567A; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
              th { background-color: #f2f2f2; text-align: left; }
              .summary { margin-top: 30px; text-align: right; font-size: 14px; }
              .summary-row { margin-bottom: 5px; }
              .total { font-weight: bold; font-size: 16px; margin-top: 10px; }
            </style>
          </head>
          <body>
            <h1>${t('export.inventoryReport', 'Inventory Report')}</h1>
            <p>${new Date().toLocaleDateString()}</p>
            
            <table>
              <thead>
                <tr>
                  <th>${t('export.itemName', 'Item Name')}</th>
                  <th style="text-align: center;">${t('export.quantity', 'Qty')}</th>
                  <th style="text-align: right;">${t('export.cost', 'Unit Cost')}</th>
                  <th style="text-align: right;">${t('export.total', 'Total')}</th>
                  <th>${t('export.warehouse', 'Warehouse')}</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-row">
                ${t('export.subtotal', 'Total (Excl. Tax)')}: 
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div class="summary-row">
                ${t('export.taxAmount', 'Tax ({{rate}}%)', { rate: taxRate * 100 })}: 
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div class="summary-row total">
                ${t('export.totalWithTax', 'Total (Incl. Tax)')}: 
                <span>${totalWithTax.toFixed(2)}</span>
              </div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e: any) {
      showError(t('general.error'), e.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Prevent rendering if theme context is not ready
  if (!colors) return <View style={{flex:1}} />;

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: colors.background }} 
      contentContainerStyle={styles.container}
      removeClippedSubviews={true}
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
            <Text style={[typography.button, styles.value, { color: colors.primary }]}>{workgroup?.join_code || '...'}</Text>
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
    width: '30%', 
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