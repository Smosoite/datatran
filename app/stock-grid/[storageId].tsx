import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, useWindowDimensions, Alert, Vibration } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useModal } from '../../providers/ModalProvider';
import { showError, showSuccess } from '../../lib/toast';
import { typography } from '../../styles/typography';
import { FontAwesome, Feather, MaterialIcons } from '@expo/vector-icons';
import { logActivity } from '../../lib/logger';
import * as Haptics from 'expo-haptics';

// --- Data Types ---
type LocationSlot = {
  id: string;
  shelf: string;
  row: string | null;
  column: string | null;
  width_span: number; // NEW: Controls the width (1-6)
  items: {
    id: string;
    name: string;
    quantity: number;
  }[] | null;
};

// We organize the grid by Shelf -> Row -> Items
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

  const { width: screenWidth } = useWindowDimensions(); 
  
  // --- CONSTANTS ---
  const TOTAL_GRID_COLS = 6; // The grid is divided into 6 units width
  const GRID_PADDING = 12;
  const GAP_SIZE = 8;
  const AVAILABLE_WIDTH = screenWidth - (GRID_PADDING * 2);
  const UNIT_WIDTH = (AVAILABLE_WIDTH - (GAP_SIZE * (TOTAL_GRID_COLS - 1))) / TOTAL_GRID_COLS;

  const [locations, setLocations] = useState<LocationSlot[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- EDIT MODE STATE ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null); // For resizing
  const [pickedSlotId, setPickedSlotId] = useState<string | null>(null); // For moving

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!storageId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('defined_locations')
        .select(`
          id, shelf, row, column, width_span,
          items ( id, name, quantity )
        `)
        .eq('storage_id', storageId);
      
      if (error) throw error;

      // Map and default width_span to 1 if null
      const formattedLocations = data.map(loc => ({
        ...loc,
        width_span: loc.width_span || 1,
        items: loc.items || [],
      }));

      setLocations(formattedLocations as LocationSlot[]);

    } catch (err: any) {
      showError(t('general.error'), err.message);
    } finally {
      setLoading(false);
    }
  }, [storageId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Visual Grid Logic ---
  // We group by Shelf -> Row. 
  // Note: We don't strictly sort by Column anymore to allow "Drag and Drop" ordering
  // But for now, we still respect the row container.
  const visualGrid = useMemo(() => {
    const shelvesDict: { [key: string]: { [key: string]: LocationSlot[] } } = {};

    locations.forEach(loc => {
      const s = loc.shelf;
      const r = loc.row || 'General'; 
      
      if (!shelvesDict[s]) shelvesDict[s] = {};
      if (!shelvesDict[s][r]) shelvesDict[s][r] = [];
      
      shelvesDict[s][r].push(loc);
    });

    // Sort Shelves and Rows alphanumerically
    return Object.keys(shelvesDict).sort((a, b) => 
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    ).map(shelfKey => {
        const sortedRows = Object.keys(shelvesDict[shelfKey]).sort((a, b) => 
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        ).map(rowKey => {
            // Sort slots within the row by their current column order
            const slots = shelvesDict[shelfKey][rowKey].sort((a, b) => {
                const colA = a.column || '0';
                const colB = b.column || '0';
                return colA.localeCompare(colB, undefined, { numeric: true, sensitivity: 'base' });
            });
            return { rowLabel: rowKey, slots };
        });
        return { shelfLabel: shelfKey, rows: sortedRows };
    });
  }, [locations]);

  // --- ACTIONS ---

  // 1. Toggle Edit Mode
  const toggleEditMode = () => {
    if (isEditMode) {
      // Exit Edit Mode
      setIsEditMode(false);
      setSelectedSlotId(null);
      setPickedSlotId(null);
    } else {
      // Enter Edit Mode (Auth Check)
      showPasscodeModal({
        title: t('stockGrid.adminAccess', 'Admin Access'),
        message: t('stockGrid.enterPasscode', 'Enter Admin Passcode to Edit Grid'),
        onSubmit: (passcode) => {
          if (passcode === workgroup?.admin_passcode) {
            setIsEditMode(true);
            showSuccess(t('stockGrid.editModeEnabled', 'Edit Mode Enabled'));
          } else {
            showError(t('stockGrid.invalidPasscode', 'Invalid Passcode'));
          }
        },
      });
    }
  };

  // 2. Resize Slot
  const handleResize = async (slot: LocationSlot, change: number) => {
    const newSpan = Math.max(1, Math.min(TOTAL_GRID_COLS, slot.width_span + change));
    if (newSpan === slot.width_span) return;

    // Optimistic Update
    setLocations(prev => prev.map(l => l.id === slot.id ? { ...l, width_span: newSpan } : l));

    // DB Update
    const { error } = await supabase
      .from('defined_locations')
      .update({ width_span: newSpan })
      .eq('id', slot.id);

    if (error) {
      showError(t('general.error'), error.message);
      fetchData(); // Revert
    }
  };

  // 3. Move Logic (Pick and Place)
  const handleSlotPress = (slot: LocationSlot) => {
    if (!isEditMode) {
      // Normal Mode: View Contents / Edit Item
      const item = slot.items?.[0];
      if (item) {
        showQuantityModal({
          title: t('stockGrid.manageItem', 'Manage Item'),
          message: `${item.name}\nQty: ${item.quantity}`,
          confirmText: t('general.remove', 'Remove Stock'),
          cancelText: t('general.cancel'),
          onSubmit: async (qty) => {
             // ... (Existing logic for removing items) ...
             const newQuantity = item.quantity - qty;
             if (newQuantity < 0) return showError(t('general.error'));
             
             await supabase.from('items').update({ quantity: newQuantity }).eq('id', item.id);
             if (workgroup?.id) {
                logActivity({
                  workgroup_id: workgroup.id, 
                  item_id: item.id, 
                  item_name: item.name, 
                  action: 'REMOVE', 
                  change_amount: -qty, 
                  final_quantity: newQuantity
                });
             }
             fetchData();
          }
        });
      } else {
          // Empty slot interaction?
          // Maybe navigate to Add Item pre-filled?
      }
      return;
    }

    // --- EDIT MODE INTERACTIONS ---
    if (pickedSlotId) {
       // PLACE ACTION: Swap the picked slot with this slot
       if (pickedSlotId === slot.id) {
         setPickedSlotId(null); // Cancel pick
         return;
       }
       handleSwapSlots(pickedSlotId, slot.id);
    } else {
       // SELECT ACTION: Show resize controls
       setSelectedSlotId(slot.id === selectedSlotId ? null : slot.id);
    }
  };

  const handleLongPress = (slot: LocationSlot) => {
    if (!isEditMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPickedSlotId(slot.id);
    setSelectedSlotId(null); // Clear selection when picking
    showSuccess(t('stockGrid.picked', 'Slot Picked'), t('stockGrid.pickedMsg', 'Tap another slot to swap positions.'));
  };

  const handleSwapSlots = async (id1: string, id2: string) => {
     // We need to swap the `column` and `row` and `shelf` values of these two locations
     // This is a bit complex because Supabase unique constraints might yell if we aren't careful.
     // For simplicity, we will just swap their CONTENT properties (Shelf, Row, Column)
     
     const loc1 = locations.find(l => l.id === id1);
     const loc2 = locations.find(l => l.id === id2);
     
     if (!loc1 || !loc2) return;

     // Optimistic
     const newLocs = locations.map(l => {
        if (l.id === id1) return { ...l, shelf: loc2.shelf, row: loc2.row, column: loc2.column };
        if (l.id === id2) return { ...l, shelf: loc1.shelf, row: loc1.row, column: loc1.column };
        return l;
     });
     setLocations(newLocs);
     setPickedSlotId(null);

     // DB Update
     // We do this serially to avoid unique constraint collisions if any (though swapping is usually safe if ID is PK)
     const { error: err1 } = await supabase.from('defined_locations').update({
        shelf: loc2.shelf, row: loc2.row, column: loc2.column
     }).eq('id', id1);
     
     const { error: err2 } = await supabase.from('defined_locations').update({
        shelf: loc1.shelf, row: loc1.row, column: loc1.column
     }).eq('id', id2);

     if (err1 || err2) {
         showError(t('general.error'), 'Swap failed. Refreshing...');
         fetchData();
     } else {
         Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
     }
  };

  const handleDeleteLocation = (id: string) => {
      showPasscodeModal({
          title: t('general.confirm', 'Confirm Delete'),
          message: t('stockGrid.deleteMsg', 'Delete this location? Items inside will lose their location.'),
          onSubmit: async (passcode) => {
              if (passcode === workgroup?.admin_passcode) {
                  await supabase.from('defined_locations').delete().eq('id', id);
                  fetchData();
                  setSelectedSlotId(null);
              }
          }
      })
  };

  if (loading) return <ActivityIndicator style={styles.centered} size="large" color={colors.primary} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* --- HEADER --- */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
             <Text style={[typography.h2, { color: colors.text }]}>{t('stockGrid.title')}</Text>
             {isEditMode && <Text style={[typography.caption, { color: colors.primary }]}>{t('stockGrid.editing', 'EDITING LAYOUT')}</Text>}
        </View>
        
        <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Edit Mode Toggle */}
            <Pressable 
                style={[styles.iconButton, { backgroundColor: isEditMode ? colors.primary : colors.card, borderColor: colors.border, borderWidth: 1 }]} 
                onPress={toggleEditMode}
            >
                <Feather name={isEditMode ? "check" : "edit-2"} size={20} color={isEditMode ? colors.primaryText : colors.text} />
            </Pressable>

            {/* Close Button */}
            <Pressable style={[styles.iconButton, { backgroundColor: colors.danger }]} onPress={() => router.back()}>
                <Feather name="x" size={20} color="white" />
            </Pressable>
        </View>
      </View>

      {/* --- GRID --- */}
      <ScrollView contentContainerStyle={[styles.scrollContent, { padding: GRID_PADDING }]}>
        <View style={styles.rackFrame}>
          {visualGrid.map((shelf) => (
            <View key={shelf.shelfLabel} style={[styles.shelfContainer, { borderColor: colors.border }]}>
              
              {/* Shelf Label */}
              <View style={[styles.shelfLabelTab, { backgroundColor: colors.border }]}>
                <Text style={[styles.shelfLabelText, { color: colors.text }]}>{shelf.shelfLabel}</Text>
              </View>

              <View style={styles.shelfContent}>
                {shelf.rows.map((row) => (
                    <View key={row.rowLabel} style={styles.rowWrapper}>
                         {/* Row Label (Optional, good for debug) */}
                         {/* <Text style={{fontSize: 10, color: colors.subtext, marginBottom: 4}}>{row.rowLabel}</Text> */}
                         
                         <View style={styles.gridContainer}>
                            {row.slots.map((slot) => {
                                // Calculate dynamic width based on span
                                // We use a little gap math to make sure it aligns perfectly
                                const slotWidth = (UNIT_WIDTH * slot.width_span) + (GAP_SIZE * (slot.width_span - 1));
                                const item = slot.items?.[0];
                                const isSelected = selectedSlotId === slot.id;
                                const isPicked = pickedSlotId === slot.id;

                                return (
                                    <Pressable
                                        key={slot.id}
                                        onPress={() => handleSlotPress(slot)}
                                        onLongPress={() => handleLongPress(slot)}
                                        delayLongPress={300}
                                        style={[
                                            styles.slot,
                                            { 
                                                width: slotWidth,
                                                height: 80, // Fixed height for consistency
                                                backgroundColor: item ? colors.card : 'transparent',
                                                borderColor: isSelected || isPicked ? colors.primary : colors.border,
                                                borderStyle: item ? 'solid' : 'dashed',
                                                borderWidth: isSelected || isPicked ? 2 : 1,
                                                opacity: isPicked ? 0.5 : 1
                                            }
                                        ]}
                                    >
                                        {isEditMode && isSelected ? (
                                            // --- EDIT CONTROLS ---
                                            <View style={styles.editControls}>
                                                <View style={styles.resizeRow}>
                                                    <Pressable onPress={() => handleResize(slot, -1)} style={styles.resizeBtn}>
                                                        <Feather name="minus" size={16} color={colors.text} />
                                                    </Pressable>
                                                    <Text style={[typography.caption, { color: colors.text }]}>{slot.width_span}x</Text>
                                                    <Pressable onPress={() => handleResize(slot, 1)} style={styles.resizeBtn}>
                                                        <Feather name="plus" size={16} color={colors.text} />
                                                    </Pressable>
                                                </View>
                                                <Pressable onPress={() => handleDeleteLocation(slot.id)} style={styles.deleteBtn}>
                                                     <Feather name="trash-2" size={14} color="white" />
                                                </Pressable>
                                            </View>
                                        ) : (
                                            // --- NORMAL CONTENT ---
                                            <>
                                                {item ? (
                                                    <>
                                                        <View style={[styles.quantityBadge, { backgroundColor: item.quantity > 0 ? colors.success : colors.danger }]}>
                                                            <Text style={styles.quantityText}>{item.quantity}</Text>
                                                        </View>
                                                        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                                                            {item.name}
                                                        </Text>
                                                    </>
                                                ) : (
                                                    <View style={[styles.emptyMarker, { backgroundColor: colors.border }]} />
                                                )}
                                                {/* Edit Indicator */}
                                                {isEditMode && (
                                                    <View style={{ position: 'absolute', bottom: 2, right: 2 }}>
                                                        <MaterialIcons name="drag-handle" size={12} color={colors.subtext} />
                                                    </View>
                                                )}
                                            </>
                                        )}
                                    </Pressable>
                                );
                            })}
                         </View>
                    </View>
                ))}
              </View>
              <View style={[styles.shelfFloor, { backgroundColor: colors.subtext }]} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Picked State Floating Instructions */}
      {pickedSlotId && (
          <View style={[styles.floatingBanner, { backgroundColor: colors.primary }]}>
              <Text style={[typography.button, { color: colors.primaryText }]}>{t('stockGrid.tapToSwap', 'Tap destination to SWAP')}</Text>
              <Pressable onPress={() => setPickedSlotId(null)}>
                  <Feather name="x-circle" size={24} color={colors.primaryText} style={{ marginLeft: 10 }} />
              </Pressable>
          </View>
      )}

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
  iconButton: {
      padding: 10,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
  },
  scrollContent: { paddingBottom: 50 },
  rackFrame: { paddingVertical: 10 },
  shelfContainer: { marginBottom: 24, position: 'relative', marginTop: 10 },
  shelfLabelTab: {
    position: 'absolute',
    left: -10,
    top: -12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 5,
  },
  shelfLabelText: { fontWeight: 'bold', fontSize: 14 },
  shelfContent: { paddingHorizontal: 0, paddingTop: 10 },
  shelfFloor: { height: 8, width: '100%', borderRadius: 4, marginTop: 4, opacity: 0.3 },
  
  rowWrapper: { marginBottom: 8 },
  gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8, // GAP_SIZE
  },
  slot: {
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    overflow: 'hidden',
  },
  
  // Content Styles
  emptyMarker: { width: 8, height: 8, borderRadius: 4 },
  quantityBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  quantityText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  itemName: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 12 },

  // Edit Mode Styles
  editControls: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
  },
  resizeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
  },
  resizeBtn: {
      padding: 4,
      backgroundColor: 'rgba(0,0,0,0.05)',
      borderRadius: 4,
  },
  deleteBtn: {
      backgroundColor: '#DC2626', // Danger
      padding: 6,
      borderRadius: 4,
  },
  
  floatingBanner: {
      position: 'absolute',
      bottom: 30,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 30,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84, 
  }
});