import { useTranslation } from 'react-i18next';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter, Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../providers/ThemeProvider';
import { FontAwesome } from '@expo/vector-icons';
import { typography } from '../../styles/typography';
import { useAuth } from '../../providers/AuthProvider';
import { useModal } from '../../providers/ModalProvider';
import { showError } from '../../lib/toast';

// Define types for our data
type Warehouse = {
  id: string;
  name: string;
};
type Storage = {
  id: string;
  name: string;
};

export default function ManageWarehouseScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme(); // --- FIX: Correct way to get colors ---
  const router = useRouter();

  const { profile, workgroup, setStockGridLocked } = useAuth();
  const { showPasscodeModal } = useModal();

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [storages, setStorages] = useState<Storage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const warehousePromise = supabase.from('warehouses').select('id, name').eq('id', id).single();
      const storagesPromise = supabase.from('storages').select('id, name').eq('warehouse_id', id);

      const [warehouseResult, storagesResult] = await Promise.all([warehousePromise, storagesPromise]);

      if (warehouseResult.error) throw warehouseResult.error;
      if (storagesResult.error) throw storagesResult.error;

      setWarehouse(warehouseResult.data);
      setStorages(storagesResult.data || []);
    } catch (error: any) {
      console.error(t('general.detailErr'), error.message);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(useCallback(() => { fetchDetails(); }, [fetchDetails]));

  // --- NEW HANDLER FUNCTION ---
  const handleOpenGrid = (storageId: string) => {
    // 1. Check if admin passcode is set
    if (!workgroup?.passcode) {
      showError(t('general.error'), "No admin passcode is set for this workgroup."); // You can add a translation for this
      return;
    }

    // 2. Show the passcode modal
    showPasscodeModal({
      title: 'stockGrid.passcodeTitle',
      message: 'stockGrid.passcodeMessage',
      onSubmit: (passcode) => {
        // 3. Check the passcode
        if (passcode === workgroup.passcode) {
          // 4. On success, lock the app and navigate
          setStockGridLocked(true);
          router.push(`/stock-grid/${storageId}`);
        } else {
          // 5. On failure, show an error
          showError(t('stockGrid.invalidPasscode'));
        }
      },
    });
  };

  if (loading) {
    return <ActivityIndicator style={[styles.centered, { backgroundColor: colors.background }]} size="large" color={colors.primary}/>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{
        title: warehouse?.name || t('warehouse.manageHeader'),
        headerRight: () => (
          <Pressable onPress={() => router.push({ pathname: '/create-storage', params: { warehouseId: id } })}>
            {/* --- FIX: Used theme color for icon --- */}
            <FontAwesome name="plus" size={24} color={colors.selector} style={{ marginRight: 15 }} />
          </Pressable>
        )
      }} />
      <FlatList
        data={storages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          // --- MODIFIED: Changed Pressable to View to act as a container ---
          <View style={[styles.card, styles.itemContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* --- MODIFIED: This Pressable now only wraps the main content --- */}
            <Pressable 
              style={styles.mainContent} 
              onPress={() => router.push(`/storage/${item.id}`)}
            >
              <FontAwesome name="inbox" size={24} color={colors.text} />
              <Text style={[typography.body, styles.itemName, { color: colors.text }]}>{item.name}</Text>
            </Pressable>
            
            {/* --- NEW: Admin-only button for stock grid --- */}
            {profile?.role === 'admin' && (
              <Pressable 
                style={[styles.gridButton, { backgroundColor: colors.selector }]} 
                onPress={() => handleOpenGrid(item.id)}
              >
                <FontAwesome name="th-large" size={20} color={colors.primaryText} />
              </Pressable>
            )}
          </View>
        )}
        ListHeaderComponent={() => <Text style={[typography.h2, styles.listHeader, { color: colors.text }]}>{t('storage.units')}</Text>}
        ListEmptyComponent={() => (
          <View style={styles.centered}>
            <Text style={[typography.caption, styles.emptyText, { color: colors.subtext }]}>{t('storage.noStorages')}</Text>
            <Text style={[typography.body, styles.emptySubtext, { color: colors.subtext }]}>{t('storage.addStorages')}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingVertical: 10 }}
      />
    </View>
  );
}
// --- FIX: Removed stray closing brace that caused a syntax error.. ---

// --- FIX: Stylesheet cleaned of hard-coded colors ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 },
  listHeader: { fontWeight: '600', paddingHorizontal: 16, marginBottom: 8 },
  itemContainer: {
    justifyContent: 'space-between',
    padding: 24,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: { borderRadius: 16, paddingHorizontal: 24, borderWidth: 1 },
  itemName: { fontWeight: '500', marginLeft: 16 },
  emptyText: { textAlign: 'center' },
  emptySubtext: { marginTop: 8, textAlign: 'center' },
  gridButton: {
    padding: 12,
    borderRadius: 8,
    marginLeft: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});