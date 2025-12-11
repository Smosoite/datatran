import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useModal } from '../../providers/ModalProvider';
import { showError, showSuccess } from '../../lib/toast';
import { typography } from '../../styles/typography';
import { FontAwesome } from '@expo/vector-icons';
import { logActivity } from '../../lib/logger';

// --- Data Types ---
type LocationSlot = {
  id: string;
  shelf: string;
  row: string | null;
  column: string | null;
  item: {
    id: string;
    name: string;
    quantity: number;
  } | null;
};

type GridRow = {
  rowLabel: string;
  slots: LocationSlot[];
};

type GridShelf = {
  shelfLabel: string;
  rows: GridRow[];
};

export default function StockGridScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { showPasscodeModal, showQuantityModal } = useModal();
  const { workgroup, setStockGridLocked } = useAuth();
  const { storageId } = useLocalSearchParams<{ storageId: string }>();

  const { width } = useWindowDimensions(); 
  
  const GRID_PADDING = 16;
  const ITEM_MARGIN = 4; 

  const [locations, setLocations] = useState<LocationSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!storageId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('defined_locations')
        .select(`
          id,
          shelf,
          row,
          column,
          items ( id, name, quantity )
        `)
        .eq('storage_id', storageId);
      
      if (error) throw error;

      const formattedLocations = data.map(loc => ({
        ...loc,
        item: loc.items && loc.items.length > 0 ? loc.items[0] : null,
      }));

      setLocations(formattedLocations as unknown as LocationSlot[]);

    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [storageId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Visual Grid Logic ---
  const visualGrid = useMemo(() => {
    const shelvesDict: { [key: string]: { [key: string]: LocationSlot[] } } = {};

    locations.forEach(loc => {
      const s = loc.shelf;
      const r = loc.row || '0'; 
      
      if (!shelvesDict[s]) shelvesDict[s] = {};
      if (!shelvesDict[s][r]) shelvesDict[s][r] = [];
      
      shelvesDict[s][r].push(loc);
    });

    const sortedShelves = Object.keys(shelvesDict).sort((a, b) => 
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    ).map(shelfKey => {
        const sortedRows = Object.keys(shelvesDict[shelfKey]).sort((a, b) => 
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        ).map(rowKey => {
            const sortedSlots = shelvesDict[shelfKey][rowKey].sort((a, b) => {
                const colA = a.column || '0';
                const colB = b.column || '0';
                return colA.localeCompare(colB, undefined, { numeric: true, sensitivity: 'base' });
            });
            return { rowLabel: rowKey, slots: sortedSlots };
        });
        return { shelfLabel: shelfKey, rows: sortedRows };
    });

    return sortedShelves;
  }, [locations]);


  // --- Event Handlers ---
  const handleExit = () => {
    showPasscodeModal({
      title: 'stockGrid.passcodeTitle',
      message: 'stockGrid.passcodeMessage',
      onSubmit: (passcode) => {
        if (passcode === workgroup?.admin_passcode) {
          setStockGridLocked(false);
          router.back();
        } else {
          showError(t('stockGrid.invalidPasscode'));
        }
      },
    });
  };

  const handleItemPress = (slot: LocationSlot) => {
    if (!slot.item) return;
    const item = slot.item;

    showQuantityModal({
      title: 'stockGrid.removeTitle',
      message: t('stockGrid.removeMessage', { itemName: item.name, count: item.quantity }),
      confirmText: 'general.submit',
      cancelText: 'general.cancel',
      onSubmit: async (amountToRemove) => {
        const newQuantity = item.quantity - amountToRemove;
        if (newQuantity < 0) {
          showError(t('restock.invalidNo')); 
          return;
        }
        try {
          const { error } = await supabase.from('items').update({ quantity: newQuantity }).eq('id', item.id);
          if (error) throw error;

          // --- NEW: Log the activity ---
          if (workgroup?.id) {
            await logActivity({
              workgroup_id: workgroup.id,
              item_id: item.id,
              item_name: item.name,
              action: 'REMOVE',
              change_amount: -amountToRemove, // Negative because we are removing
              final_quantity: newQuantity
            });
          }
          // -----------------------------

          showSuccess(t('general.itemSuccess'));
          await fetchData();
        } catch (err: any) {
          showError(err.message);
        }
      },
    });
  };

  if (loading) return <ActivityIndicator style={styles.centered} size="large" color={colors.primary} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[typography.h2, { color: colors.text }]}>{t('stockGrid.title')}</Text>
        <Pressable style={[styles.exitButton, { backgroundColor: colors.danger }]} onPress={handleExit}>
          <FontAwesome name="lock" size={16} color={colors.primaryText} />
          <Text style={[typography.button, styles.exitButtonText, { color: colors.primaryText }]}>
            {t('stockGrid.exitButton')}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { padding: GRID_PADDING }]}>
        <View style={styles.rackFrame}>
          {visualGrid.map((shelf) => (
            <View key={shelf.shelfLabel} style={[styles.shelfContainer, { borderColor: colors.border }]}>
              <View style={[styles.shelfLabelTab, { backgroundColor: colors.border }]}>
                <Text style={[styles.shelfLabelText, { color: colors.text }]}>{shelf.shelfLabel}</Text>
              </View>

              <View style={styles.shelfContent}>
                {shelf.rows.map((row) => {
                  const availableWidth = width - (GRID_PADDING * 2);
                  const itemCount = row.slots.length;
                  const dynamicItemWidth = (availableWidth / Math.max(1, itemCount)) - (ITEM_MARGIN * 2);

                  return (
                    <View key={row.rowLabel} style={styles.rowContainer}>
                      {row.slots.map((slot) => (
                        <Pressable
                          key={slot.id}
                          style={[
                            styles.slot,
                            { 
                              width: dynamicItemWidth,
                              margin: ITEM_MARGIN,
                              backgroundColor: slot.item ? colors.selector : 'transparent',
                              borderColor: colors.border 
                            },
                            slot.item ? styles.slotOccupied : styles.slotEmpty
                          ]}
                          onPress={() => handleItemPress(slot)}
                        >
                          {slot.item ? (
                            <>
                              <View style={[
                                styles.quantityBadge, 
                                { backgroundColor: slot.item.quantity > 0 ? colors.success : colors.danger }
                              ]}>
                                <Text style={styles.quantityText}>{slot.item.quantity}</Text>
                              </View>
                              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                                {slot.item.name}
                              </Text>
                            </>
                          ) : (
                            <View style={[styles.emptyMarker, { backgroundColor: colors.border }]} />
                          )}
                        </Pressable>
                      ))}
                    </View>
                  );
                })}
              </View>
              <View style={[styles.shelfFloor, { backgroundColor: colors.subtext }]} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    elevation: 2,
    zIndex: 10,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  exitButtonText: { marginLeft: 8, fontSize: 14 },
  scrollContent: { paddingBottom: 50 },
  rackFrame: { paddingVertical: 10 },
  shelfContainer: { marginBottom: 20, position: 'relative' },
  shelfLabelTab: {
    position: 'absolute',
    left: -10,
    top: -12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 5,
  },
  shelfLabelText: { fontWeight: 'bold', fontSize: 12 },
  shelfContent: { paddingHorizontal: 0 },
  rowContainer: {
    flexDirection: 'row', 
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  slot: {
    height: 80,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed', 
  },
  slotOccupied: {
    borderStyle: 'solid',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    justifyContent: 'space-between',
    padding: 8,
  },
  slotEmpty: { opacity: 0.3 },
  emptyMarker: { width: 10, height: 10, borderRadius: 5 },
  quantityBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  quantityText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  itemName: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  shelfFloor: { height: 6, width: '100%', borderRadius: 3, marginTop: 2, opacity: 0.5 },
});