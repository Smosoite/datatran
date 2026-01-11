import { useTranslation } from 'react-i18next';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../../providers/ThemeProvider';
import { typography } from '../../../styles/typography';

// Define a type for our warehouse data for better code quality
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
  const { colors } = useTheme(); // Correct way to get colors
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

  // useFocusEffect runs the fetch logic every time the user navigates to this screen
  useFocusEffect(
    useCallback(() => {
      fetchWarehouses();
    }, [fetchWarehouses])
  );

  if (loading) {
    return <ActivityIndicator style={[styles.centered, { backgroundColor: colors.background }]} size="large" color={colors.primary} />;
  }

  const renderEmptyComponent = () => (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <Text style={[typography.caption, styles.emptyText, { color: colors.subtext }]}>{t('warehouse.noWarehouses')}</Text>
      <Pressable style={[styles.button, { backgroundColor: colors.selector }]} onPress={() => router.push('/create-warehouse')}>
        <Text style={[typography.button, styles.buttonText, { color: colors.primaryText }]}>{t('warehouse.createFirst')}</Text>
      </Pressable>
    </View>
  );

  if (warehouses.length === 0) {
    return renderEmptyComponent();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          // Note: The title for this screen is set in the parent _layout.tsx
          headerRight: () => (
            <Pressable onPress={() => router.push('/create-warehouse')}>
              <FontAwesome name="plus" size={24} color={colors.selector} style={{ marginRight: 15 }}/>
            </Pressable>
          ),
        }}
      />

    <FlatList
      data={warehouses}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable
          style={[styles.itemContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push(`/warehouse/${item.id}`)}
        >
          <Feather 
  name={item.icon || 'archive'} // Use a sensible default like 'archive'
  size={32} 
  color={colors.text} 
  style={styles.itemIcon}
/>
          <View style={styles.itemTextContainer}>
            <Text style={[typography.body, styles.itemName, { color: colors.text }]}>{item.name}</Text>
            {item.description && <Text style={[typography.caption, styles.itemDescription, { color: colors.subtext }]}>{item.description}</Text>}
          </View>
        </Pressable>
      )}
      contentContainerStyle={styles.list}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  list: {
    padding: 8,
  },
  emptyText: {
    marginBottom: 24,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    fontWeight: '600',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    // Shadow is optional and can be tricky with themes
    elevation: 1, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  itemIcon: {
    marginRight: 16,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontWeight: 'bold',
  },
  itemDescription: {
    marginTop: 8,
  },
});