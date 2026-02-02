import { useTranslation } from 'react-i18next';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Plus, Warehouse as WarehouseIcon, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../../providers/ThemeProvider';
import { typography } from '../../../styles/typography';

type Warehouse = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
};

export default function WarehouseScreen() {
  const { t } = useTranslation();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const router = useRouter();

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, icon, description');

      if (error) throw error;

      setWarehouses(data || []);
    } catch (error: any) {
      console.error(t('general.warehouseFetch'), error.message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      fetchWarehouses();
    }, [fetchWarehouses])
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (warehouses.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.primaryMuted }]}>
          <WarehouseIcon size={48} color={colors.primary} />
        </View>
        <Text style={[typography.h3, { color: colors.text, marginTop: 16 }]}>
          {t('warehouse.noWarehouses')}
        </Text>
        <Pressable
          style={[styles.createButton, { backgroundColor: colors.primary, marginTop: 24 }]}
          onPress={() => router.push('/create-warehouse')}
        >
          <Text style={[typography.button, { color: colors.primaryText }]}>
            {t('warehouse.createFirst')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/create-warehouse')} style={{ marginRight: 15 }}>
              <Plus size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={warehouses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.warehouseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/warehouse/${item.id}`)}
          >
            <View style={[styles.warehouseIcon, { backgroundColor: colors.primaryMuted }]}>
              <WarehouseIcon size={24} color={colors.primary} />
            </View>
            <View style={styles.warehouseContent}>
              <Text style={[typography.h4, { color: colors.text }]}>{item.name}</Text>
              {item.description && (
                <Text style={[typography.caption, { color: colors.subtext, marginTop: 4 }]} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>
            <ChevronRight size={20} color={colors.subtext} />
          </Pressable>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  listContent: {
    padding: 20,
  },
  warehouseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  warehouseIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  warehouseContent: {
    flex: 1,
  },
});
