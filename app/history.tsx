import { useTranslation } from 'react-i18next';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Modal, TextInput, TouchableOpacity } from 'react-native';
import { useFocusEffect, Stack } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { typography } from '../styles/typography';
import { FontAwesome } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import Papa from 'papaparse';
import { showError } from '../lib/toast';

// Simple date formatter
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

type LogEntry = {
  id: string;
  created_at: string;
  item_name: string;
  action: string;
  change_amount: number | null;
  final_quantity: number | null;
  profiles: { username: string } | null; 
};

export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { profile } = useAuth();
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [customDays, setCustomDays] = useState('30'); 
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv'); // NEW: Format toggle

  // --- DATA FETCHING (DISPLAY) ---
  const fetchLogs = async () => {
    if (!profile?.workgroup_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          id, created_at, item_name, action, change_amount, final_quantity,
          profiles ( username )
        `)
        .eq('workgroup_id', profile.workgroup_id)
        .order('created_at', { ascending: false })
        .limit(50); 

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchLogs(); }, []));

  // --- EXPORT LOGIC ---

  const handleExport = async (timeframe: 'today' | 'all' | 'custom') => {
    setIsExporting(true);
    try {
      // 1. Build Query
      let query = supabase
        .from('activity_logs')
        .select(`
          created_at, 
          item_name, 
          action, 
          change_amount, 
          final_quantity,
          profiles ( username )
        `)
        .eq('workgroup_id', profile?.workgroup_id)
        .order('created_at', { ascending: false });

      // 2. Apply Time Filters
      const now = new Date();
      
      if (timeframe === 'today') {
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        query = query.gte('created_at', startOfDay);
      } 
      else if (timeframe === 'custom') {
        const days = parseInt(customDays) || 0;
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - days);
        query = query.gte('created_at', pastDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data || data.length === 0) {
        showError(t('general.noData'), t('history.noLogsInRange', 'No history found for this period.'));
        setIsExporting(false);
        return;
      }

      // 3. Route to correct generator
      if (exportFormat === 'csv') {
        await generateCSV(data, timeframe);
      } else {
        await generatePDF(data, timeframe);
      }
      
      setShowExportModal(false);
      
    } catch (err: any) {
      showError(t('general.error'), err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const generateCSV = async (data: any[], timeframe: string) => {
    const csvData = data.map((item: any) => ({
      [t('export.date', 'Date')]: formatDate(item.created_at),
      [t('export.user', 'User')]: item.profiles?.username || 'Unknown',
      [t('export.item', 'Item')]: item.item_name,
      [t('export.action', 'Action')]: item.action,
      [t('export.change', 'Change')]: item.change_amount ? item.change_amount : '-',
      [t('export.total', 'Total Stock')]: item.final_quantity !== null ? item.final_quantity : '-',
    }));

    const csvString = Papa.unparse(csvData);
    const filename = `history_${timeframe}_${new Date().getTime()}.csv`;
    const fileUri = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(fileUri);
  };

  const generatePDF = async (data: any[], timeframe: string) => {
    // Build Table Rows
    const rowsHtml = data.map((item: any) => {
      const dateStr = formatDate(item.created_at);
      const userStr = item.profiles?.username || 'Unknown';
      const changeStr = item.change_amount ? (item.change_amount > 0 ? `+${item.change_amount}` : item.change_amount) : '-';
      
      // Basic color logic for HTML
      const color = item.action === 'RESTOCK' ? '#2e7d32' : (item.action === 'REMOVE' ? '#d32f2f' : '#333');

      return `
        <tr>
          <td>${dateStr}</td>
          <td>${userStr}</td>
          <td style="font-weight: bold;">${item.item_name}</td>
          <td><span style="color: ${color}; font-weight: bold; border: 1px solid ${color}; padding: 2px 4px; border-radius: 4px; font-size: 10px;">${item.action}</span></td>
          <td style="text-align: right; color: ${color};">${changeStr}</td>
          <td style="text-align: right;">${item.final_quantity ?? '-'}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
            h1 { color: #10567A; font-size: 22px; margin-bottom: 5px; }
            .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
            
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background-color: #f2f2f2; border: 1px solid #ccc; padding: 8px; text-align: left; }
            td { border: 1px solid #ddd; padding: 8px; }
            
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <h1>${t('history.exportTitle', 'History Report')}</h1>
          <div class="meta">
            ${t('export.generatedOn')}: ${new Date().toLocaleString()}<br/>
            ${t('export.filter', 'Filter')}: ${timeframe.toUpperCase()}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>${t('export.date', 'Date')}</th>
                <th>${t('export.user', 'User')}</th>
                <th>${t('export.item', 'Item')}</th>
                <th>${t('export.action', 'Action')}</th>
                <th style="text-align: right;">${t('export.change', 'Change')}</th>
                <th style="text-align: right;">${t('export.total', 'Total')}</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  // --- RENDER HELPERS ---

  const getActionColor = (action: string) => {
    switch (action) {
      case 'RESTOCK': return colors.success;
      case 'REMOVE': return colors.danger;
      case 'CREATE': return colors.primary;
      default: return colors.text;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: t('settings.history') || 'Activity History',
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowExportModal(true)} style={{ padding: 8 }}>
              <FontAwesome name="download" size={20} color={colors.primary} />
            </TouchableOpacity>
          )
        }} 
      />
      
      {loading ? (
        <ActivityIndicator style={styles.centered} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.logItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.row}>
                <Text style={[typography.caption, { color: colors.subtext }]}>{formatDate(item.created_at)}</Text>
                <Text style={[typography.caption, { color: colors.primary }]}>{item.profiles?.username || 'Unknown'}</Text>
              </View>
              
              <View style={styles.mainRow}>
                <Text style={[typography.body, styles.itemName, { color: colors.text }]}>{item.item_name}</Text>
                <Text style={[typography.h3, { color: getActionColor(item.action) }]}>
                   {item.change_amount && item.change_amount > 0 ? '+' : ''}{item.change_amount}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={[typography.caption, styles.actionBadge, { color: getActionColor(item.action), borderColor: getActionColor(item.action) }]}>
                  {item.action}
                </Text>
                {item.final_quantity !== null && (
                   <Text style={[typography.caption, { color: colors.subtext }]}>
                     Total: {item.final_quantity}
                   </Text>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
             <Text style={[styles.empty, { color: colors.subtext }]}>No history found.</Text>
          )}
        />
      )}

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
              {t('history.exportTitle', 'Export History')}
            </Text>

            {/* FORMAT TOGGLE */}
            <View style={styles.toggleContainer}>
              <Pressable 
                style={[styles.toggleBtn, exportFormat === 'csv' && { backgroundColor: colors.primary }]}
                onPress={() => setExportFormat('csv')}
              >
                <Text style={[styles.toggleText, { color: exportFormat === 'csv' ? '#fff' : colors.text }]}>CSV</Text>
              </Pressable>
              <Pressable 
                style={[styles.toggleBtn, exportFormat === 'pdf' && { backgroundColor: colors.primary }]}
                onPress={() => setExportFormat('pdf')}
              >
                <Text style={[styles.toggleText, { color: exportFormat === 'pdf' ? '#fff' : colors.text }]}>PDF</Text>
              </Pressable>
            </View>

            {/* Option 1: Today */}
            <Pressable 
              style={[styles.modalBtn, { borderColor: colors.border }]} 
              onPress={() => handleExport('today')}
              disabled={isExporting}
            >
              <Text style={[typography.button, { color: colors.text }]}>{t('history.exportToday', 'Today')}</Text>
            </Pressable>

            {/* Option 2: All Time */}
            <Pressable 
              style={[styles.modalBtn, { borderColor: colors.border }]} 
              onPress={() => handleExport('all')}
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
                style={[styles.smallBtn, { backgroundColor: colors.primary }]} 
                onPress={() => handleExport('custom')}
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

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  logItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  itemName: {
    fontWeight: '600',
  },
  actionBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
  },
  empty: { textAlign: 'center', marginTop: 50 },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: { marginBottom: 20 },
  
  // Toggle Styles
  toggleContainer: { flexDirection: 'row', marginBottom: 20, width: '100%', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#ccc' },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  toggleText: { fontWeight: 'bold' },

  modalBtn: {
    width: '100%',
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    width: '100%',
    justifyContent: 'center'
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: 60,
    textAlign: 'center',
  },
  smallBtn: {
    marginLeft: 15,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtn: { marginTop: 10, padding: 10 },
});