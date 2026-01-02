import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
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
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  // --- FIX: Removed unused `hasLocations` state ----

  const { colors } = useTheme(); // --- FIX: Correct way to get colors ---
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
        const { data: restockData, error: restockError } = await supabase.rpc('get_restock_items');
        
        if (restockError) {
          console.error(t('general.errorFetch'), restockError.message);
        } else {
          setRestockItems(restockData || []);
        }

        setLoading(false);
      };

      fetchData();
    }, [t]) // Added `t` to dependency array for correctness
  );

  // --- FIX: Removed unused `updateItemQuantity` function ---

  return (
    // --- FIX: `styles.container` is now just `flex: 1` ---
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}></Text>
        <View style={styles.buttonContainer}>
          <Pressable style={[styles.actionButton, { backgroundColor: colors.selector }]} onPress={() => router.push('/add-item')}>
            <FontAwesome name="plus-circle" size={20} color={colors.text} style={[
    typography.shadow, { textShadowColor: colors.textShadow }]} />
            <Text style={[typography.button, typography.shadow, styles.buttonText, { color: colors.text, textShadowColor: colors.textShadow }]}>{t('dashboard.addItem')}</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, { backgroundColor: colors.selector }]} onPress={() => router.push('/find')}>
            <FontAwesome name="search" size={20} color={colors.text} style={[
    typography.shadow, { textShadowColor: colors.textShadow }]} />
            <Text style={[typography.button, typography.shadow, styles.buttonText, { color: colors.text, textShadowColor: colors.textShadow }]}>{t('dashboard.findItem')}</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, { backgroundColor: colors.selector }]} onPress={() => router.push('/scan')}>
            <FontAwesome name="barcode" size={20} color={colors.text} style={[
    typography.shadow, { textShadowColor: colors.textShadow }]}/>
            <Text style={[typography.button, typography.shadow, styles.buttonText, { color: colors.text, textShadowColor: colors.textShadow }]}>{t('dashboard.scanItem')}</Text>
          </Pressable>
        </View>
      </View>
      
      <Text style={[typography.h3, styles.listHeader, { color: colors.text }]}>{t('dashboard.needsRestock')}</Text>
      
      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ paddingTop: 20 }}/>
        ) : (
          <FlatList
            data={restockItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.itemContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View>
                  <Text style={[typography.body, styles.itemName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[typography.body, styles.itemLocation, { color: colors.subtext }]}>{item.warehouse_name} / {item.storage_name}</Text>
                </View>
                <Text style={[typography.body, styles.itemQuantity, { color: colors.danger }]}>
                  {item.quantity} / {item.restock_threshold}
                </Text>
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={[typography.button, styles.emptyText, { color: colors.subtext }]}>{t('dashboard.wellStocked')}</Text>
              </View>
            )}
          />
        )}
        
        {!loading && restockItems.length > 0 && (
          <Pressable style={[styles.restockButton, { backgroundColor: colors.selector }]} onPress={() => router.push('/restock')}>
            <FontAwesome name="cubes" size={20} color={colors.text} style={[
    typography.shadow, { textShadowColor: colors.textShadow }]} />
            <Text style={[typography.h3, typography.shadow, styles.restockButtonText, { color: colors.text, textShadowColor: colors.textShadow }]}>{t('restock.button')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // --- FIX: Container style no longer centers everything, allowing for top-down layout ---
  container: {
    flex: 1,
  },
  headerContainer: {
    padding: 16,
    paddingTop: 40, // Adjust for status bar if needed
    borderBottomWidth: 1,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  buttonText: {
    marginLeft: 8,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listContainer: { flex: 1 },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemName: {
  },
  itemLocation: {
    marginTop: 8,
  },
  itemQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
  },
  restockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    margin: 16,
    borderRadius: 16,
    elevation: 3,
  },
  restockButtonText: { marginLeft: 16 },
});


App/(tabs)/Warehouse/index.tsx
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
      <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => router.push('/create-warehouse')}>
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