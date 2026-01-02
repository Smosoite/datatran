import { useTranslation } from 'react-i18next';
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect, Stack } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { typography } from '../styles/typography';

// --- COPILOT IMPORTS ---
import { CopilotStep, walkthroughable, useCopilot } from "react-native-copilot";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create the Walkable View
const WalkableView = walkthroughable(View);

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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // --- COPILOT STATE ---
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [tourStarted, setTourStarted] = useState(false);

  // --- COPILOT HOOK ---
  const { start: startTour } = useCopilot();

  // --- START TOUR AFTER DATA LOADS AND LAYOUT IS READY ---
  useEffect(() => {
    // Only start tour when: not loading, layout ready, has data, and tour not started yet
    if (loading || !isLayoutReady || logs.length === 0 || tourStarted) return;

    const checkAndStartTour = async () => {
      try {
        const tourKey = `HAS_SEEN_HISTORY_TOUR_${profile?.id}`;
        const hasSeen = await AsyncStorage.getItem(tourKey);
        if (!hasSeen) {
          // Wait for FlatList to render items
          setTimeout(() => {
            startTour();
            setTourStarted(true);
          }, 800);
          await AsyncStorage.setItem(tourKey, 'true');
        }
      } catch (e) {
        console.warn("Tour check failed", e);
      }
    };
    
    checkAndStartTour();
  }, [loading, isLayoutReady, logs.length, tourStarted, profile?.id]); 

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

  useFocusEffect(
    useCallback(() => { 
      fetchLogs(); 
    }, [profile?.workgroup_id])
  );

  const getActionColor = (action: string) => {
    switch (action) {
      case 'RESTOCK': return colors.success;
      case 'REMOVE': return colors.danger;
      case 'CREATE': return colors.primary;
      default: return colors.text;
    }
  };

  return (
    <View 
      style={[styles.container, { backgroundColor: colors.background }]}
      onLayout={() => setIsLayoutReady(true)}
    >
      <Stack.Screen options={{ title: t('settings.history') || 'Activity History' }} />
      
      {loading ? (
        <ActivityIndicator style={styles.centered} size="large" color={colors.primary} />
      ) : logs.length > 0 ? (
        // Wrap the first log item in a CopilotStep
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            // Only wrap the first item in CopilotStep
            if (index === 0) {
              return (
                <CopilotStep 
                  text={t('pilot.history') || "This timeline tracks every action taken by your team."} 
                  order={1} 
                  name="historyList"
                >
                  <WalkableView 
                    style={[styles.logItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                    collapsable={false}
                  >
                    <View style={styles.row}>
                      <Text style={[typography.caption, { color: colors.subtext }]}>
                        {formatDate(item.created_at)}
                      </Text>
                      <Text style={[typography.caption, { color: colors.primary }]}>
                        {item.profiles?.username || 'Unknown'}
                      </Text>
                    </View>
                    
                    <View style={styles.mainRow}>
                      <Text style={[typography.body, styles.itemName, { color: colors.text }]}>
                        {item.item_name}
                      </Text>
                      <Text style={[typography.h3, { color: getActionColor(item.action) }]}>
                        {item.change_amount && item.change_amount > 0 ? '+' : ''}{item.change_amount}
                      </Text>
                    </View>

                    <View style={styles.row}>
                      <Text 
                        style={[
                          typography.caption, 
                          styles.actionBadge, 
                          { color: getActionColor(item.action), borderColor: getActionColor(item.action) }
                        ]}
                      >
                        {item.action}
                      </Text>
                      {item.final_quantity !== null && (
                        <Text style={[typography.caption, { color: colors.subtext }]}>
                          Total: {item.final_quantity}
                        </Text>
                      )}
                    </View>
                  </WalkableView>
                </CopilotStep>
              );
            }
            
            // Regular render for other items
            return (
              <View style={[styles.logItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.row}>
                  <Text style={[typography.caption, { color: colors.subtext }]}>
                    {formatDate(item.created_at)}
                  </Text>
                  <Text style={[typography.caption, { color: colors.primary }]}>
                    {item.profiles?.username || 'Unknown'}
                  </Text>
                </View>
                
                <View style={styles.mainRow}>
                  <Text style={[typography.body, styles.itemName, { color: colors.text }]}>
                    {item.item_name}
                  </Text>
                  <Text style={[typography.h3, { color: getActionColor(item.action) }]}>
                    {item.change_amount && item.change_amount > 0 ? '+' : ''}{item.change_amount}
                  </Text>
                </View>

                <View style={styles.row}>
                  <Text 
                    style={[
                      typography.caption, 
                      styles.actionBadge, 
                      { color: getActionColor(item.action), borderColor: getActionColor(item.action) }
                    ]}
                  >
                    {item.action}
                  </Text>
                  {item.final_quantity !== null && (
                    <Text style={[typography.caption, { color: colors.subtext }]}>
                      Total: {item.final_quantity}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <Text style={[styles.empty, { color: colors.subtext }]}>
              {t('general.noHistory') || 'No history found.'}
            </Text>
          )}
        />
      ) : (
        <Text style={[styles.empty, { color: colors.subtext }]}>
          {t('general.noHistory') || 'No history found.'}
        </Text>
      )}
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
});