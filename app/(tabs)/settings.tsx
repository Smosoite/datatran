import { useTranslation } from 'react-i18next';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, ScrollView, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
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

const TAX_OPTIONS = [
  { label: '0%', value: 0 },
  { label: '10%', value: 0.10 },
  { label: '14%', value: 0.14 },
  { label: '24%', value: 0.24 },
  { label: '25.5%', value: 0.255 },
];

export default function SettingsScreen() {
  const { mode, setMode, theme, setTheme, colors } = useTheme();
  const isDarkMode = mode === 'dark';

  const { t, i18n } = useTranslation();
  const { showConfirmation, showPasscodeModal } = useModal();
  const router = useRouter();
  const { profile, workgroup, refreshProfile } = useAuth();
   
  // --- EXPORT STATE ---
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [customDays, setCustomDays] = useState('');

  // Default fallback tax rate if item doesn't have one specific
  const [globalTaxRate, setGlobalTaxRate] = useState(0.255); 
  // Tax dropdown visibility state
  const [showTaxDropdown, setShowTaxDropdown] = useState(false);

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
    try {
      // Attempt to sign out normally, but race against a 2-second timeout
      // This prevents the button from doing "nothing" if the Supabase client is stuck
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 2000))
      ]);
    } catch (err) {
      console.log("Logout cleanup error (ignored):", err);
    } finally {
      // ALWAYS force redirect to login, no matter what happened above
      router.replace('/login');
    }
  }, [t, router]);

  const toggleMode = useCallback(() => {
    setMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, [setMode]);

  // --- EXPORT LOGIC ---

  const handleExportData = useCallback(async (timeFilter: 'today' | 'all' | 'custom' = 'all') => {
    setIsExporting(true);
    try {
      // 1. Fetch Data 
      // Added 'updated_at' to handle "Today/Custom" logic if needed
      let query = supabase
        .from('items')
        .select(`
          name, 
          quantity, 
          cost_per_unit, 
          purchase_price,
          purchase_vat_percent,
          barcode,
          updated_at,
          storage:storages (
            name,
            warehouse:warehouses ( name )
          )
        `)
        .order('name', { ascending: true });

      // Apply Filters based on Modal selection
      if (timeFilter !== 'all') {
        const date = new Date();
        if (timeFilter === 'today') {
           date.setHours(0, 0, 0, 0); // Start of today
        } else if (timeFilter === 'custom' && customDays) {
           const days = parseInt(customDays) || 0;
           date.setDate(date.getDate() - days);
        }
        query = query.gte('updated_at', date.toISOString());
      }

      const { data: items, error } = await query;

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
          warehouseName, 
          storageName,   
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
      const exportDate = new Date().toLocaleString(i18n.language); 

      // 4. Generate File based on Toggle Selection
      if (exportFormat === 'csv') {
        await generateCSV(formattedData, totalNetStockValue, totalGrossStockValue, exportedBy, exportDate);
      } else {
        await generatePDF(formattedData, totalNetStockValue, totalGrossStockValue, exportedBy, exportDate);
      }

      // Close modal on success
      setShowExportModal(false);

    } catch (error: any) {
      showError(t('general.error'), t('general.exportError', { message: error.message }));
    } finally {
      setIsExporting(false);
    }
  }, [t, globalTaxRate, profile, i18n.language, exportFormat, customDays]);

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
            <Text style={[typography.button, styles.value, { color: colors.selector }]}>{workgroup?.name || '...'}</Text>
          </View>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={[typography.button, styles.label, { color: colors.text }]}>{t('settings.code')}</Text>
            <Text style={[typography.button, styles.value, { color: colors.selector }]}>{workgroup?.join_code || '...'}</Text>
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
                 <FontAwesome name="history" size={18} color={colors.selector} />
                 <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>{t('settings.history')}</Text>
               </View>
               <FontAwesome name="chevron-right" size={14} color={colors.selector} />
             </Pressable> 

             <Pressable 
               style={[styles.card, styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border }]} 
               onPress={handleChangePasscode}
             >
               <View style={{flexDirection:'row', alignItems:'center'}}>
                 <FontAwesome name="lock" size={18} color={colors.selector} />
                 <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>{t('settings.changePasscode')}</Text>
               </View>
               <FontAwesome name="chevron-right" size={14} color={colors.selector} />
             </Pressable>

             <Pressable 
               style={[styles.card, styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border }]} 
               onPress={() => router.push('/manage-members')}
             >
               <View style={{flexDirection:'row', alignItems:'center'}}>
                 <FontAwesome name="users" size={18} color={colors.selector} />
                 <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>{t('settings.members')}</Text>
               </View>
               <FontAwesome name="chevron-right" size={14} color={colors.selector} />
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
          
          {/* TAX RATE SELECTOR (DROPDOWN) */}
          <Pressable 
            style={[styles.row, { paddingHorizontal: 16, borderBottomWidth: showTaxDropdown ? 0 : 1, borderBottomColor: colors.border }]} 
            onPress={() => setShowTaxDropdown(!showTaxDropdown)}
          >
             <View style={{flexDirection:'row', alignItems:'center'}}>
              <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
              <View>
                 <Text style={[typography.button, styles.menuButtonText, { color: colors.text }]}>{t('settings.taxRate')}</Text>
                 <Text style={[typography.caption, { marginLeft: 12, color: colors.subtext }]}>{t('settings.taxFallback', '(Default Fallback)')}</Text>
              </View>
            </View>
            <View style={{ flexDirection:'row', alignItems:'center'}}>
              <Text style={[typography.button, { color: colors.selector, marginRight: 8 }]}>{(globalTaxRate * 100).toFixed(1)}%</Text>
              <FontAwesome name={showTaxDropdown ? "chevron-up" : "chevron-down"} size={12} color={colors.selector} />
            </View>
          </Pressable>
          
          {/* DROPDOWN OPTIONS (Accordion Style) */}
          {showTaxDropdown && (
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: 'rgba(0,0,0,0.02)' }}>
              {TAX_OPTIONS.map((rate) => (
                <Pressable
                  key={rate.value}
                  onPress={() => {
                    setGlobalTaxRate(rate.value);
                    setShowTaxDropdown(false);
                  }}
                  style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    paddingVertical: 12, 
                    paddingHorizontal: 24,
                    paddingLeft: 46 
                  }}
                >
                   <Text style={[typography.body, { color: colors.text }]}>{rate.label}</Text>
                   {globalTaxRate === rate.value && <FontAwesome name="check" size={12} color={colors.selector} />}
                </Pressable>
              ))}
            </View>
          )}

          {/* EXPORT BUTTON - TRIGGER MODAL */}
          <Pressable 
            style={[styles.menuButton, { paddingHorizontal: 16, borderBottomWidth: 0 }, isExporting && { opacity: 0.6 }]} 
            onPress={() => setShowExportModal(true)} 
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
      
      {/* EXPORT MODAL */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.h3, styles.modalTitle, { color: colors.text }]}>
              {t('settings.exportTitle', 'Export Inventory')}
            </Text>

            {/* FORMAT TOGGLE */}
            <View style={styles.toggleContainer}>
              <Pressable 
                style={[styles.toggleBtn, exportFormat === 'csv' && { backgroundColor: colors.selector }]}
                onPress={() => setExportFormat('csv')}
              >
                <Text style={[styles.toggleText, { color: exportFormat === 'csv' ? '#fff' : colors.text }]}>CSV</Text>
              </Pressable>
              <Pressable 
                style={[styles.toggleBtn, exportFormat === 'pdf' && { backgroundColor: colors.selector }]}
                onPress={() => setExportFormat('pdf')}
              >
                <Text style={[styles.toggleText, { color: exportFormat === 'pdf' ? '#fff' : colors.text }]}>PDF</Text>
              </Pressable>
            </View>

            {/* Option 1: Today */}
            <Pressable 
              style={[styles.modalBtn, { borderColor: colors.border }]} 
              onPress={() => handleExportData('today')}
              disabled={isExporting}
            >
              <Text style={[typography.button, { color: colors.text }]}>{t('history.today', 'Today')}</Text>
            </Pressable>

            {/* Option 2: All Time */}
            <Pressable 
              style={[styles.modalBtn, { borderColor: colors.border }]} 
              onPress={() => handleExportData('all')}
              disabled={isExporting}
            >
              <Text style={[typography.button, { color: colors.text }]}>{t('history.exportAll', 'From Start (All)')}</Text>
            </Pressable>

            {/* Option 3: Custom Days */}
            <View style={styles.customRow}>
              <Text style={[typography.body, { color: colors.text, marginRight: 10 }]}>{t('history.last', 'Last')}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                keyboardType="numeric"
                value={customDays}
                onChangeText={setCustomDays}
              />
              <Text style={[typography.body, { color: colors.text, marginLeft: 10 }]}>{t('history.days', 'Days')}</Text>
              
              <Pressable 
                style={[styles.smallBtn, { backgroundColor: colors.selector }]} 
                onPress={() => handleExportData('custom')}
                disabled={isExporting}
              >
                 {isExporting ? <ActivityIndicator color="#fff" size="small"/> : <FontAwesome name="arrow-right" size={14} color="#fff" />}
              </Pressable>
            </View>

            <Pressable style={styles.cancelBtn} onPress={() => setShowExportModal(false)}>
              <Text style={{ color: colors.subtext }}>{t('general.cancel', 'Cancel')}</Text>
            </Pressable>

          </View>
        </View>
      </Modal>

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

  // --- MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    width: '100%',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleText: {
    fontWeight: '600',
    fontSize: 14,
  },
  modalBtn: {
    width: '100%',
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 60,
    textAlign: 'center',
    fontSize: 16,
  },
  smallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  cancelBtn: {
    marginTop: 0,
    padding: 10,
  },
});