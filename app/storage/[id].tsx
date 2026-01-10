import '../../i18n';
import i18n from '../../i18n';
import { I18nextProvider } from 'react-i18next';
import { useTranslation } from 'react-i18next';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter, Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeProvider';
import { showError, showSuccess } from '../../lib/toast';
import { useModal } from '../../providers/ModalProvider';
import { typography } from '../../styles/typography';

type DefinedLocation = {
  id: string;
  shelf: string;
  row: string | null;
  column: string | null;
  container: string | null;
  items: { name: string }[] | null;
};

export default function ManageStorageScreen() {
  const { t } = useTranslation();
  const { id: storageId } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme(); // --- FIX: Correct way to get colors ---
  const router = useRouter();
  const { showConfirmation } = useModal();

  const [locations, setLocations] = useState<DefinedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageName, setStorageName] = useState(''); // State for dynamic title

  const fetchLocations = useCallback(async () => {
    if (!storageId) return;
    setLoading(true);
    try {
      // Fetch storage name for the title
      const { data: storageData, error: storageError } = await supabase
        .from('storages')
        .select('name')
        .eq('id', storageId)
        .single();

      if (storageError) throw storageError;
      if (storageData) setStorageName(storageData.name);

      const { data, error } = await supabase
        .from('defined_locations')
        .select(`*, items ( name )`)
        .eq('storage_id', storageId)
        .order('shelf', { ascending: true })
        .order('row', { ascending: true });
      
      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      console.error(t('general.errorFetchLocal'), error.message);
    } finally {
      setLoading(false);
    }
  }, [storageId, t]);

  useFocusEffect(useCallback(() => { fetchLocations(); }, [fetchLocations]));

  const handleDeleteLocation = (locationId: string) => {
    // --- FIX: Used translation keys for alert ---
    showConfirmation({
    title: t('location.confirmDeleteTitle'),
    message: t('location.confirmDeleteMessage'),
    confirmText: t('general.delete'),
    isDestructive: true, // This will make the confirm button red
    onConfirm: async () => {
      try {
        const { error } = await supabase.from('defined_locations').delete().eq('id', locationId);
        if (error) throw error;

        // Remove from local state for instant UI update
        setLocations(prevLocations => prevLocations.filter(loc => loc.id !== locationId));
        // Optionally, show a success toast here
        // showSuccess(t('location.deleteSuccess'));
      } catch (err: any) {
        // Show a non-blocking esrror toast on failure
        showError(err.message);
      }
    },
  });
};
  
  const formatLocationName = (loc: DefinedLocation) => {
    return [loc.shelf, loc.row, loc.column, loc.container].filter(Boolean).join(' - ');
  }

  if (loading) {
    return <ActivityIndicator style={[styles.centered, { backgroundColor: colors.background }]} size="large" color={colors.primary} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{
        title: storageName || t('storage.manageLayout'), // Dynamic title
        headerRight: () => (
          <Pressable onPress={() => router.push({ pathname: '/create-location', params: { storageId } })}>
            <FontAwesome name="plus" size={24} color={colors.selector
            } style={{ marginRight: 15 }} />
          </Pressable>
        )
      }} />

      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => { 
          const assignedItem = item.items && item.items.length > 0 ? item.items[0] : null;
          
          return ( 
            <View style={[styles.itemContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.locationDetails}>
                <Text style={[typography.body, styles.itemName, { color: colors.text }]}>{formatLocationName(item)}</Text>
                {assignedItem ? (
                  <Text style={[typography.body, styles.assignedItemText, { color: colors.success }]}>
                    <FontAwesome name="cube" size={14} color={colors.success} /> {assignedItem.name}
                  </Text>
                ) : (
                  <Text style={[typography.caption, styles.emptySlotText, { color: colors.subtext }]}>- {t('general.empty')} -</Text>
                )}
              </View>

              <View style={styles.buttonGroup}>
                <Pressable style={styles.actionButton} onPress={() => router.push(`/edit-location/${item.id}`)}>
                  <FontAwesome name="pencil" size={18} color={colors.primary} />
                </Pressable>
                <Pressable style={styles.actionButton} onPress={() => handleDeleteLocation(item.id)}>
                  <FontAwesome name="trash" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          );
        }}
        ListHeaderComponent={() => <Text style={[typography.h2, styles.listHeader, { color: colors.text }]}>{t('location.defined')}</Text>}
        ListEmptyComponent={() => (
          <View style={styles.centered}>
            <Text style={[typography.caption, styles.emptyText, { color: colors.subtext }]}>{t('location.noLocations')}</Text>
            <Text style={[typography.body, styles.emptySubtext, { color: colors.subtext }]}>{t('location.addAShelf')}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingVertical: 10 }}
      />
    </View>
  );
}
// --- FIX: Removed stray closing braces and parentheses that caused a syntax error ---

// --- FIX: Stylesheet cleaned of hard-coded colors ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50, paddingHorizontal: 24 },
  listHeader: { fontWeight: '600', paddingHorizontal: 16, marginBottom: 8 },
  itemContainer: { 
    padding: 16, 
    borderRadius: 8, 
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  locationDetails: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontWeight: '500',
  },
  buttonGroup: {
    flexDirection: 'row'
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  assignedItemText: {
    fontWeight: '600',
    marginTop: 8,
  },
  emptySlotText: {
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyText: { textAlign: 'center' },
  emptySubtext: { marginTop: 8, textAlign: 'center' },
});