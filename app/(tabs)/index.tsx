import '../../i18n';
import i18n from '../../i18n';
import { I18nextProvider } from 'react-i18next';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList, ScrollView } from 'react-native';
import { Bell, Plus, ArrowRightLeft, TrendingUp, AlertTriangle, Package, Warehouse } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { typography } from '../../styles/typography';

type RestockItem = {
  id: string;
  name: string;
  quantity: number;
  restock_threshold: number;
  warehouse_name: string;
  storage_name: string;
};

type ActivityItem = {
  id: string;
  item_name: string;
  action: string;
  change_amount: number;
  created_at: string;
  warehouse_name: string;
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useAuth();

  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [totalValue, setTotalValue] = useState(0);
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

          const { data: activityData } = await supabase
            .from('activity_logs')
            .select(`
              id,
              item_name,
              action,
              change_amount,
              created_at,
              items (
                storages (
                  warehouses (name)
                )
              )
            `)
            .order('created_at', { ascending: false })
            .limit(5);

          const { data: itemsData } = await supabase
            .from('items')
            .select('quantity, price_per_unit');

          if (!isActive) return;

          if (restockError) {
            console.error(t('general.errorFetch'), restockError.message);
          } else {
            setRestockItems(restockData || []);
          }

          if (activityData) {
            const formatted = activityData.map((log: any) => ({
              id: log.id,
              item_name: log.item_name,
              action: log.action,
              change_amount: log.change_amount,
              created_at: log.created_at,
              warehouse_name: log.items?.storages?.warehouses?.name || 'Unknown'
            }));
            setRecentActivity(formatted);
          }

          if (itemsData) {
            const total = itemsData.reduce((sum, item) => {
              return sum + (item.quantity * (item.price_per_unit || 0));
            }, 0);
            setTotalValue(total);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.primaryText }]}>
                {profile?.username?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <Text style={[typography.h2, { color: colors.text }]}>Inventory Dashboard</Text>
          </View>
          <Pressable style={styles.bellIcon}>
            <Bell size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.valuationCard, { backgroundColor: colors.primary }]}>
            <View style={styles.metricHeader}>
              <Text style={[typography.label, { color: colors.primaryText, opacity: 0.9 }]}>
                Total Valuation
              </Text>
              <TrendingUp size={20} color={colors.primaryText} />
            </View>
            <Text style={[typography.numberLarge, { color: colors.primaryText, marginTop: 8 }]}>
              {formatCurrency(totalValue)}
            </Text>
            <Text style={[typography.caption, { color: colors.primaryText, opacity: 0.8, marginTop: 4 }]}>
              +2.4% vs last mo.
            </Text>
          </View>

          <View style={[styles.metricCard, styles.lowStockCard, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
            <View style={styles.metricHeader}>
              <Text style={[typography.label, { color: colors.danger }]}>
                Low Stock
              </Text>
              <AlertTriangle size={20} color={colors.danger} />
            </View>
            <Text style={[typography.numberLarge, { color: colors.text, marginTop: 8 }]}>
              {restockItems.length}
            </Text>
            <Text style={[typography.caption, { color: colors.danger, marginTop: 4 }]}>
              REQUIRES ACTION
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 16 }]}>Quick Actions</Text>
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
              onPress={() => router.push('/scan')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <ArrowRightLeft size={24} color={colors.accent} />
              </View>
              <Text style={[typography.h4, { color: colors.text, marginTop: 12 }]}>Transfer</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.h3, { color: colors.text }]}>Recent Activity</Text>
            <Pressable onPress={() => router.push('/history')}>
              <Text style={[typography.caption, { color: colors.primary }]}>View All</Text>
            </Pressable>
          </View>

          {recentActivity.length === 0 ? (
            <View style={[styles.emptyActivity, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
              <Text style={[typography.body, { color: colors.subtext }]}>No recent activity</Text>
            </View>
          ) : (
            recentActivity.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.activityCard, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
              >
                <View style={[styles.activityIcon, { backgroundColor: colors.primaryMuted }]}>
                  <Package size={20} color={colors.primary} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={[typography.h4, { color: colors.text }]} numberOfLines={1}>
                    {item.item_name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.success, marginTop: 2 }]}>
                    Stock {item.action === 'ADD' ? 'increased' : 'decreased'}: {Math.abs(item.change_amount)} units
                  </Text>
                  <Text style={[typography.captionSmall, { color: colors.subtext, marginTop: 4 }]}>
                    {item.warehouse_name.toUpperCase()} • {getTimeAgo(item.created_at).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.activityChevron}>
                  <Text style={{ color: colors.subtext }}>›</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <View style={[styles.section, { marginBottom: 32 }]}>
          <View style={styles.storageHeader}>
            <View>
              <Text style={[typography.captionSmall, { color: colors.subtext }]}>STORAGE CAPACITY</Text>
              <Text style={[typography.h4, { color: colors.text, marginTop: 4 }]}>Warehouse Alpha</Text>
            </View>
            <Pressable style={[styles.storageButton, { backgroundColor: colors.primary }]}>
              <Warehouse size={20} color={colors.primaryText} />
            </Pressable>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary, width: '68%' }]} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  bellIcon: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  valuationCard: {
    flex: 1.2,
  },
  lowStockCard: {
    flex: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityChevron: {
    marginLeft: 8,
  },
  emptyActivity: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
