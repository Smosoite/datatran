import { useTranslation } from 'react-i18next';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import Papa from 'papaparse';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
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
  // Default fallback tax rate if item doesn't have one specific
  const [globalTaxRate, setGlobalTaxRate] = useState(0.255); 

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

  // --- TAX SELECTOR ---

  const handleSelectTaxRate = useCallback(() => {
    Alert.alert(
      t('settings.selectTax', 'Select Fallback Tax Rate'),
      t('settings.selectTaxMsg', 'This rate applies to items that do not have a specific tax set.'),
      [
        { text: '0%', onPress: () => setGlobalTaxRate(0) },
        { text: '10%', onPress: () => setGlobalTaxRate(0.10) },
        { text: '14%', onPress: () => setGlobalTaxRate(0.14) },
        { text: '24%', onPress: () => setGlobalTaxRate(0.24) },
        { text: '25.5%', onPress: () => setGlobalTaxRate(0.255) },
        { text: t('general.cancel', 'Cancel'), style: 'cancel' }
      ]
    );
  }, [t]);

  // --- EXPORT LOGIC ---

  const handleExportData = useCallback(async () => {
    setIsExporting(true);
    try {
      // 1. Fetch Data (Added new financial columns + Relationships for Location)
      // Note: This assumes you have relationships set up in Supabase:
      // items -> storages -> warehouses
      const { data: items, error } = await supabase
        .from('items')
        .select(`
          name, 
          quantity, 
          cost_per_unit, 
          purchase_price,
          purchase_vat_percent,
          barcode,
          storage:storages (
            name,
            warehouse:warehouses ( name )
          )
        `)
        .order('name', { ascending: true });

      if (error) throw error;
      if (!items || items.length === 0) {
        showError(t('general.noData'), t('general.noDataToExport'));
        setIsExporting(false);
        return;
      }

      let totalNetStockValue = 0;
      let totalGrossStockValue = 0;

      // 2. Format Data & Calculate Totals
      const formattedData = items.map((item: any) => {
        const qty = item.quantity || 0;
        
        // Extract location names safely
        const storageName = item.storage?.name || '-';
        const warehouseName = item.storage?.warehouse?.name || '-';
        
        // Use new fields if available, otherwise fallback to old 'cost_per_unit'
        const unitCost = item.purchase_price !== null ? item.purchase_price : (item.cost_per_unit || 0);
        
        // Use item specific tax if available, otherwise global setting
        const taxPercent = item.purchase_vat_percent !== null ? item.purchase_vat_percent : (globalTaxRate * 100);
        
        const rowTotalNet = qty * unitCost;
        const taxMultiplier = 1 + (taxPercent / 100);
        const rowTotalGross = rowTotalNet * taxMultiplier;

        totalNetStockValue += rowTotalNet;
        totalGrossStockValue += rowTotalGross;

        return {
          warehouseName, // Added
          storageName,   // Added
          name: item.name,
          quantity: qty,
          unitCost: unitCost,
          taxPercent: taxPercent,
          totalNet: rowTotalNet,
          totalGross: rowTotalGross
        };
      });

      // 3. Prepare Metadata
      const exportedBy = profile?.full_name || profile?.email || 'Admin';
      const exportDate = new Date().toLocaleString(i18n.language); // Localized date

      Alert.alert(
        t('settings.exportFormatTitle', 'Choose Export Format'),
        t('settings.exportFormatMessage', 'Select how you want to view the inventory report.'),
        [
          {
            text: 'CSV',
            onPress: () => generateCSV(formattedData, totalNetStockValue, totalGrossStockValue, exportedBy, exportDate)
          },
          {
            text: 'PDF',
            onPress: () => generatePDF(formattedData, totalNetStockValue, totalGrossStockValue, exportedBy, exportDate)
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
  }, [t, globalTaxRate, profile, i18n.language]);

  const generateCSV = async (data: any[], totalNet: number, totalGross: number, user: string, date: string) => {
    try {
      const csvRows = [];
      
      // Header Info
      csvRows.push({ [t('export.colName')]: `${t('export.generatedOn')}: ${date}` });
      csvRows.push({ [t('export.colName')]: `${t('export.preparedBy')}: ${user}` });
      csvRows.push({}); // Empty line

      // Loop Data
      data.forEach((item, index) => {
        csvRows.push({
          // New Columns First
          [t('export.colWarehouse', 'Warehouse')]: item.warehouseName,
          [t('export.colStorage', 'Storage')]: item.storageName,
          // Existing Columns
          [t('export.colName')]: item.name,
          [t('export.colQty')]: item.quantity,
          [t('export.colUnitCost')]: item.unitCost.toFixed(2),
          [t('export.colTax')]: `${item.taxPercent}%`,
          [t('export.colTotalNet')]: item.totalNet.toFixed(2),
          [t('export.colTotalGross')]: item.totalGross.toFixed(2),
        });

        // Empty row every 10 items for readability
        if ((index + 1) % 10 === 0) {
          csvRows.push({});
        }
      });

      // Footer
      csvRows.push({}); // Empty line at bottom
      
      // Summary Rows
      // We align totals roughly by using keys from later columns
      csvRows.push({
        [t('export.colTax')]: t('export.costOfStock'), 
        [t('export.colTotalNet')]: totalNet.toFixed(2) 
      });
      
      csvRows.push({
        [t('export.colTax')]: t('export.withTax'),
        [t('export.colTotalNet')]: totalGross.toFixed(2)
      });

      const csvString = Papa.unparse(csvRows);
      const filename = `inventory_${new Date().getTime()}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri);
    } catch (e: any) {
      showError(t('general.error'), e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const generatePDF = async (data: any[], totalNet: number, totalGross: number, user: string, date: string) => {
    try {
      // Build Rows with spacing logic
      const rowsHtml = data.map((item, index) => {
        const isSpacer = (index + 1) % 10 === 0;
        
        let html = `
          <tr>
            <td style="text-align: left;">${item.warehouseName}</td>
            <td style="text-align: left;">${item.storageName}</td>
            <td style="text-align: left;">${item.name}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">${item.unitCost.toFixed(2)}</td>
            <td style="text-align: center;">${item.taxPercent}%</td>
            <td style="text-align: right;">${item.totalNet.toFixed(2)}</td>
            <td style="text-align: right;">${item.totalGross.toFixed(2)}</td>
          </tr>
        `;

        // Add empty row spacer - colspan increased to 8
        if (isSpacer) {
          html += `<tr style="height: 20px;"><td colspan="8" style="border:none;"></td></tr>`;
        }
        return html;
      }).join('');

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
              .header { margin-bottom: 20px; }
              .header h1 { color: #10567A; margin-bottom: 5px; font-size: 20px; }
              .meta { font-size: 12px; color: #666; }
              
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { background-color: #f2f2f2; border: 1px solid #ccc; padding: 6px; font-size: 10px; text-transform: uppercase; }
              td { border: 1px solid #ddd; padding: 6px; font-size: 11px; }
              
              /* Footer Styling */
              tfoot td { font-weight: bold; font-size: 13px; background-color: #fff; border: none; padding-top: 10px; }
              .label-col { text-align: right; padding-right: 10px; color: #10567A; }
              .value-col { text-align: right; border-bottom: 1px solid #000; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${t('export.inventoryReport')}</h1>
              <div class="meta">${t('export.generatedOn')}: ${date}</div>
              <div class="meta">${t('export.preparedBy')}: ${user}</div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">${t('export.colWarehouse', 'Warehouse')}</th>
                  <th style="text-align: left;">${t('export.colStorage', 'Storage')}</th>
                  <th style="text-align: left;">${t('export.colName')}</th>
                  <th>${t('export.colQty')}</th>
                  <th>${t('export.colUnitCost')}</th>
                  <th>${t('export.colTax')}</th>
                  <th>${t('export.colTotalNet')}</th>
                  <th>${t('export.colTotalGross')}</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
              <tfoot>
                <tr style="height: 20px;"><td colspan="8"></td></tr>
                
                <tr>
                  <td colspan="5"></td>
                  <td class="label-col">${t('export.costOfStock')}</td>
                  <td class="value-col">${totalNet.toFixed(2)}</td>
                  <td></td>
                </tr>

                <tr>
                  <td colspan="5"></td>
                  <td class="label-col">${t('export.withTax')}</td>
                  <td class="value-col">${totalGross.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
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
    >
      
      {/* APPEARANCE */}
      <View style={styles.section}>
        <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>{t('settings.appearance')}</Text>
        
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.appRow}>
            <Text style={[typography.button, styles.label, { color: colors.text }]}>{t('settings.dark')}</Text>
            <Switch
              trackColor={{ false: colors.background, true: colors.border }}
              thumbColor={colors.selector}
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
        
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0 }]}>
          
          {/* TAX RATE SELECTOR */}
          <Pressable 
            style={[styles.row, { paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border }]} 
            onPress={handleSelectTaxRate}
          >
             <View style={{flexDirection:'row', alignItems:'center'}}>
              <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
              <View>
                 <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>{t('settings.taxRate')}</Text>
                 <Text style={[typography.caption, { marginLeft: 12, color: colors.subtext }]}>{t('settings.taxFallback', '(Default Fallback)')}</Text>
              </View>
            </View>
            <View style={{ flexDirection:'row', alignItems:'center'}}>
              <Text style={[typography.button, { color: colors.primary, marginRight: 8 }]}>{(globalTaxRate * 100).toFixed(1)}%</Text>
              <FontAwesome name="chevron-down" size={12} color={colors.subtext} />
            </View>
          </Pressable>

          {/* EXPORT BUTTON */}
          <Pressable 
            style={[styles.menuButton, { paddingHorizontal: 16, borderBottomWidth: 0 }, isExporting && { opacity: 0.6 }]} 
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