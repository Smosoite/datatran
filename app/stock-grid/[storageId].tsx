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
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { logActivity } from '../../lib/logger';
import * as Haptics from 'expo-haptics';

// --- Data Types ---
type LocationSlot = {
  id: string;
  shelf: string;
  row: string | null;
  column: string | null;
  width_span: number; 
  height_span: number; // NEW: Controls height
  items: {
    id: string;
    name: string;
    quantity: number;
  }[] | null;
};

export default function StockGridScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { showPasscodeModal, showQuantityModal } = useModal();
  const { workgroup } = useAuth();
  const { storageId } = useLocalSearchParams<{ storageId: string }>();

  const { width: screenWidth } = useWindowDimensions(); 
  
  // --- LAYOUT CONSTANTS ---
  const TOTAL_GRID_COLS = 6; 
  const GRID_PADDING = 10; // Slightly reduced padding
  const GAP_SIZE = 6;      // Slightly tighter gap
  const BASE_HEIGHT = 80;  // 1x Height Unit

  // Precise Math to fill screen
  const AVAILABLE_WIDTH = screenWidth - (GRID_PADDING * 2);
  const TOTAL_GAPS_WIDTH = GAP_SIZE * (TOTAL_GRID_COLS - 1);
  const UNIT_WIDTH = (AVAILABLE_WIDTH - TOTAL_GAPS_WIDTH) / TOTAL_GRID_COLS;

  const [locations, setLocations] = useState<LocationSlot[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- EDIT MODE STATE ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [pickedSlotId, setPickedSlotId] = useState<string | null>(null);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!storageId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('defined_locations')
        .select(`
          id, shelf, row, column, width_span, height_span,
          items ( id, name, quantity )
        `)
        .eq('storage_id', storageId);
      
      if (error) throw error;

      const formattedLocations = data.map(loc => ({
        ...loc,
        width_span: loc.width_span || 1,
        height_span: loc.height_span || 1, // Default to 1 if null
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
  const visualGrid = useMemo(() => {
    const shelvesDict: { [key: string]: { [key: string]: LocationSlot[] } } = {};

    locations.forEach(loc => {
      const s = loc.shelf;
      const r = loc.row || 'General'; 
      
      if (!shelvesDict[s]) shelvesDict[s] = {};
      if (!shelvesDict[s][r]) shelvesDict[s][r] = [];
      
      shelvesDict[s][r].push(loc);
    });

    return Object.keys(shelvesDict).sort((a, b) => 
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    ).map(shelfKey => {
        const sortedRows = Object.keys(shelvesDict[shelfKey]).sort((a, b) => 
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        ).map(rowKey => {
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

  const toggleEditMode = () => {
    if (isEditMode) {
      setIsEditMode(false);
      setSelectedSlotId(null);
      setPickedSlotId(null);
    } else {
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

  // --- NEW: Handle Resize for both Dimensions ---
  const handleResize = async (slot: LocationSlot, dimension: 'width' | 'height', change: number) => {
    let newVal = 1;
    
    if (dimension === 'width') {
        newVal = Math.max(1, Math.min(TOTAL_GRID_COLS, slot.width_span + change));
        if (newVal === slot.width_span) return;
        setLocations(prev => prev.map(l => l.id === slot.id ? { ...l, width_span: newVal } : l));
        // DB Update
        await supabase.from('defined_locations').update({ width_span: newVal }).eq('id', slot.id);
    } else {
        newVal = Math.max(1, Math.min(4, slot.height_span + change)); // Max height 4x for sanity
        if (newVal === slot.height_span) return;
        setLocations(prev => prev.map(l => l.id === slot.id ? { ...l, height_span: newVal } : l));
        // DB Update
        await supabase.from('defined_locations').update({ height_span: newVal }).eq('id', slot.id);
    }
  };

  const handleSlotPress = (slot: LocationSlot) => {
    if (!isEditMode) {
      const item = slot.items?.[0];
      if (item) {
        showQuantityModal({
          title: item.name,
          message: `${t('stockGrid.currentQty')}: ${item.quantity}`,
          confirmText: t('general.remove', 'Remove Stock'),
          cancelText: t('general.cancel'),
          onSubmit: async (qty) => {
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
      }
      return;
    }

    if (pickedSlotId) {
       if (pickedSlotId === slot.id) {
         setPickedSlotId(null); 
         return;
       }
       handleSwapSlots(pickedSlotId, slot.id);
    } else {
       setSelectedSlotId(slot.id === selectedSlotId ? null : slot.id);
    }
  };

  const handleLongPress = (slot: LocationSlot) => {
    if (!isEditMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPickedSlotId(slot.id);
    setSelectedSlotId(null); 
  };

  const handleSwapSlots = async (id1: string, id2: string) => {
     const loc1 = locations.find(l => l.id === id1);
     const loc2 = locations.find(l => l.id === id2);
     if (!loc1 || !loc2) return;

     // Optimistic Swap
     const newLocs = locations.map(l => {
        if (l.id === id1) return { ...l, shelf: loc2.shelf, row: loc2.row, column: loc2.column };
        if (l.id === id2) return { ...l, shelf: loc1.shelf, row: loc1.row, column: loc1.column };
        return l;
     });
     setLocations(newLocs);
     setPickedSlotId(null);

     await supabase.from('defined_locations').update({ shelf: loc2.shelf, row: loc2.row, column: loc2.column }).eq('id', id1);
     await supabase.from('defined_locations').update({ shelf: loc1.shelf, row: loc1.row, column: loc1.column }).eq('id', id2);
     
     Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
             {isEditMode && <Text style={[typography.caption, { color: colors.primary, fontWeight: 'bold' }]}>{t('stockGrid.editing', 'EDITING LAYOUT')}</Text>}
        </View>
        
        <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable 
                style={[styles.iconButton, { backgroundColor: isEditMode ? colors.primary : colors.card, borderColor: colors.border, borderWidth: 1 }]} 
                onPress={toggleEditMode}
            >
                <Feather name={isEditMode ? "check" : "edit-2"} size={20} color={isEditMode ? colors.primaryText : colors.text} />
            </Pressable>
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
              
              <View style={[styles.shelfLabelTab, { backgroundColor: colors.border }]}>
                <Text style={[styles.shelfLabelText, { color: colors.text }]}>{shelf.shelfLabel}</Text>
              </View>

              <View style={styles.shelfContent}>
                {shelf.rows.map((row) => (
                    <View key={row.rowLabel} style={styles.rowWrapper}>
                         <View style={[styles.gridContainer, { gap: GAP_SIZE }]}>
                            {row.slots.map((slot) => {
                                // --- DIMENSION CALCULATIONS ---
                                const wSpan = slot.width_span || 1;
                                const hSpan = slot.height_span || 1;
                                
                                // Width: unit * span + gaps * (span-1)
                                const slotWidth = (UNIT_WIDTH * wSpan) + (GAP_SIZE * (wSpan - 1));
                                
                                // Height: unit * span + gaps * (span-1)
                                const slotHeight = (BASE_HEIGHT * hSpan) + (GAP_SIZE * (hSpan - 1));

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
                                                height: slotHeight, // Dynamic Height
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
                                                
                                                {/* Width Controls */}
                                                <View style={styles.resizeRow}>
                                                    <Text style={[typography.caption, { color: colors.subtext, fontSize: 10, width: 40 }]}>Width:</Text>
                                                    <Pressable onPress={() => handleResize(slot, 'width', -1)} style={styles.resizeBtn}>
                                                        <Feather name="minus" size={14} color={colors.text} />
                                                    </Pressable>
                                                    <Text style={[typography.caption, { color: colors.text, marginHorizontal: 4 }]}>{wSpan}</Text>
                                                    <Pressable onPress={() => handleResize(slot, 'width', 1)} style={styles.resizeBtn}>
                                                        <Feather name="plus" size={14} color={colors.text} />
                                                    </Pressable>
                                                </View>

                                                {/* Height Controls (NEW) */}
                                                <View style={styles.resizeRow}>
                                                    <Text style={[typography.caption, { color: colors.subtext, fontSize: 10, width: 40 }]}>Height:</Text>
                                                    <Pressable onPress={() => handleResize(slot, 'height', -1)} style={styles.resizeBtn}>
                                                        <Feather name="minus" size={14} color={colors.text} />
                                                    </Pressable>
                                                    <Text style={[typography.caption, { color: colors.text, marginHorizontal: 4 }]}>{hSpan}</Text>
                                                    <Pressable onPress={() => handleResize(slot, 'height', 1)} style={styles.resizeBtn}>
                                                        <Feather name="plus" size={14} color={colors.text} />
                                                    </Pressable>
                                                </View>

                                                {/* Delete */}
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

      {/* Picked State Instructions */}
      {pickedSlotId && (
          <View style={[styles.floatingBanner, { backgroundColor: colors.primary }]}>
              <Text style={[typography.button, { color: colors.primaryText }]}>{t('stockGrid.tapToSwap', 'Tap to SWAP')}</Text>
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
      // gap: GAP_SIZE is handled inline to use constant
  },
  slot: {
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
    overflow: 'hidden',
  },
  
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

  editControls: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
  },
  resizeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
  },
  resizeBtn: {
      padding: 4,
      backgroundColor: 'rgba(0,0,0,0.05)',
      borderRadius: 4,
  },
  deleteBtn: {
      backgroundColor: '#DC2626',
      padding: 4,
      borderRadius: 4,
      marginTop: 4
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