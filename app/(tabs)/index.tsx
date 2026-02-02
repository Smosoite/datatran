import '../../i18n';
import i18n from '../../i18n';
import { I18nextProvider } from 'react-i18next';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList, ScrollView } from 'react-native';
import { Plus, Search, ScanBarcode, AlertTriangle, Package } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { typography } from '../../styles/typography';

type RestockItem = {
  id: string;
  name: string;
  quantity: number;
  restock_threshold: number;
  warehouse_name: string;
  storage_name: string;
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchData = async () => {
        setLoading(true);

        try {
          const timeoutPromise = new Promise((resolve) =>
             setTimeout(() => resolve({ error: { message: 'Request timed out' }, data: null }), 5000)
          );

          const { data: restockData, error: restockError } = (await Promise.race([
            supabase.rpc('get_restock_items'),
            timeoutPromise
          ])) as any;

          if (!isActive) return;

          if (restockError) {
            console.error(t('general.errorFetch'), restockError.message);
          } else {
            setRestockItems(restockData || []);
          }

        } catch (err) {
          console.error("Unexpected fetch error:", err);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      fetchData();

      return () => { isActive = false; };
    }, [t])
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.quickActionsGrid}>
            <Pressable
              style={[styles.quickActionCard, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => router.push('/add-item')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.primaryMuted }]}>
                <Plus size={24} color={colors.primary} />
              </View>
              <Text style={[typography.h4, { color: colors.text, marginTop: 12 }]}>Add Item</Text>
            </Pressable>

            <Pressable
              style={[styles.quickActionCard, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => router.push('/find')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Search size={24} color={colors.accent} />
              </View>
              <Text style={[typography.h4, { color: colors.text, marginTop: 12 }]}>Find Item</Text>
            </Pressable>

            <Pressable
              style={[styles.quickActionCard, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => router.push('/scan')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <ScanBarcode size={24} color={colors.warning} />
              </View>
              <Text style={[typography.h4, { color: colors.text, marginTop: 12 }]}>Scan</Text>
            </Pressable>
          </View>
        </View>

        {restockItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <AlertTriangle size={20} color={colors.danger} />
                <Text style={[typography.h3, { color: colors.text, marginLeft: 8 }]}>Needs Restock</Text>
              </View>
            </View>

            <FlatList
              data={restockItems}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.restockCard, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => router.push(`/edit-item/${item.id}`)}
                >
                  <View style={[styles.restockIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <Package size={20} color={colors.danger} />
                  </View>
                  <View style={styles.restockContent}>
                    <Text style={[typography.h4, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.subtext, marginTop: 4 }]} numberOfLines={1}>
                      {item.warehouse_name} / {item.storage_name}
                    </Text>
                  </View>
                  <View style={styles.restockQuantity}>
                    <Text style={[typography.number, { color: colors.danger, fontSize: 18 }]}>
                      {item.quantity}
                    </Text>
                    <Text style={[typography.caption, { color: colors.subtext }]}>
                      / {item.restock_threshold}
                    </Text>
                  </View>
                </Pressable>
              )}
            />

            <Pressable
              style={[styles.restockButton, { backgroundColor: colors.primary, marginTop: 16 }]}
              onPress={() => router.push('/restock')}
            >
              <Text style={[typography.button, { color: colors.primaryText }]}>
                {t('restock.button')}
              </Text>
            </Pressable>
          </View>
        )}

        {restockItems.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryMuted }]}>
              <Package size={48} color={colors.primary} />
            </View>
            <Text style={[typography.h3, { color: colors.text, marginTop: 16 }]}>
              All Stocked Up!
            </Text>
            <Text style={[typography.body, { color: colors.subtext, marginTop: 8, textAlign: 'center' }]}>
              {t('dashboard.wellStocked')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  restockIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restockContent: {
    flex: 1,
    marginLeft: 12,
  },
  restockQuantity: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  restockButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
