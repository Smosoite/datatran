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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';

// --- Data Types ---
type LocationSlot = {
  id: string;
  shelf: string;
  row: string | null;
  column: string | null;
  width_span: number; 
  height_span: number;
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
  const GRID_PADDING = 12; 
  const GAP_SIZE = 8;      
  const BASE_HEIGHT = 80;  

  // Precise Math to fill screen
  // (Available Width - Total Gap Space) / Number of Columns
  const AVAILABLE_WIDTH = screenWidth - (GRID_PADDING * 2);
  const UNIT_WIDTH = (AVAILABLE_WIDTH - (GAP_SIZE * (TOTAL_GRID_COLS - 1))) / TOTAL_GRID_COLS;

  const [locations, setLocations] = useState<LocationSlot[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- EDIT MODE STATE ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [showGridLines, setShowGridLines] = useState(false); // Toggle for Column Lines
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
        height_span: loc.height_span || 1,
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

  const handleResizeComplete = async (slotId: string, dimension: 'width' | 'height', newSpan: number) => {
    // 1. Update Local State
    setLocations(prev => prev.map(l => {
        if (l.id !== slotId) return l;
        return { 
            ...l, 
            width_span: dimension === 'width' ? newSpan : l.width_span,
            height_span: dimension === 'height' ? newSpan : l.height_span
        };
    }));

    // 2. Trigger Haptic
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 3. Persist to DB
    const updatePayload = dimension === 'width' ? { width_span: newSpan } : { height_span: newSpan };
    await supabase.from('defined_locations').update(updatePayload).eq('id', slotId);
  };

  // --- GESTURE COMPONENTS ---
  // We define these inline to capture the item context, but memoize if perf issues arise
  const ResizeHandle = ({ 
    dimension, 
    currentSpan, 
    slotId,
    unitSize 
  }: { 
    dimension: 'width' | 'height', 
    currentSpan: number, 
    slotId: string,
    unitSize: number 
  }) => {
    const isHorizontal = dimension === 'width';
    
    // We use a simplified gesture that tracks translation
    // We run the logic on JS thread at the end to trigger state update
    const pan = Gesture.Pan()
        .runOnJS(true)
        .onUpdate((e) => {
             // Optional: You could add live feedback here with Reanimated shared values
             // But for grid snapping, updating on 'End' is usually cleaner UX
        })
        .onEnd((e) => {
            const dragDist = isHorizontal ? e.translationX : e.translationY;
            // Calculate how many "units" we dragged
            // We use a threshold of 50% of a unit to snap to the next one
            const unitsMoved = Math.round(dragDist / (unitSize + GAP_SIZE));
            
            if (unitsMoved !== 0) {
                const maxSpan = isHorizontal ? 6 : 4; 
                const newSpan = Math.max(1, Math.min(maxSpan, currentSpan + unitsMoved));
                
                if (newSpan !== currentSpan) {
                    handleResizeComplete(slotId, dimension, newSpan);
                }
            }
        });

    return (
        <GestureDetector gesture={pan}>
            <View 
                style={[
                    styles.resizeHandle,
                    isHorizontal ? styles.resizeHandleRight : styles.resizeHandleBottom,
                    { backgroundColor: colors.primary }
                ]}
            >
                <MaterialIcons 
                    name={isHorizontal ? "drag-handle" : "drag-handle"} 
                    size={16} 
                    color="white" 
                    style={{ transform: [{ rotate: isHorizontal ? '90deg' : '0deg' }] }}
                />
            </View>
        </GestureDetector>
    );
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
       // In drag mode, tapping just selects/deselects for clarity, 
       // but resizing is done via handles now.
    }
  };

  const handleLongPress = (slot: LocationSlot) => {
    if (!isEditMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPickedSlotId(slot.id);
  };

  const handleSwapSlots = async (id1: string, id2: string) => {
     const loc1 = locations.find(l => l.id === id1);
     const loc2 = locations.find(l => l.id === id2);
     if (!loc1 || !loc2) return;

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
          message: t('stockGrid.deleteMsg', 'Delete this location?'),
          onSubmit: async (passcode) => {
              if (passcode === workgroup?.admin_passcode) {
                  await supabase.from('defined_locations').delete().eq('id', id);
                  fetchData();
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
            {/* Toggle Grid Lines (Only visible in Edit Mode) */}
            {isEditMode && (
                <Pressable 
                    style={[styles.iconButton, { backgroundColor: showGridLines ? colors.selector : colors.card, borderColor: colors.border, borderWidth: 1 }]} 
                    onPress={() => setShowGridLines(!showGridLines)}
                >
                    <MaterialIcons name="grid-on" size={20} color={showGridLines ? 'white' : colors.text} />
                </Pressable>
            )}

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
                         {/* --- BACKGROUND GRID LINES --- */}
                         {isEditMode && showGridLines && (
                             <View style={styles.backgroundGrid}>
                                 {Array.from({ length: TOTAL_GRID_COLS }).map((_, i) => (
                                     <View 
                                        key={i} 
                                        style={[
                                            styles.backgroundGridCol, 
                                            { 
                                                width: UNIT_WIDTH, 
                                                marginRight: i === TOTAL_GRID_COLS - 1 ? 0 : GAP_SIZE,
                                                borderColor: colors.border 
                                            }
                                        ]} 
                                     />
                                 ))}
                             </View>
                         )}

                         <View style={[styles.gridContainer, { gap: GAP_SIZE }]}>
                            {row.slots.map((slot) => {
                                // --- DIMENSIONS ---
                                const wSpan = slot.width_span || 1;
                                const hSpan = slot.height_span || 1;
                                
                                // Calculation includes the gaps spanned
                                const slotWidth = (UNIT_WIDTH * wSpan) + (GAP_SIZE * (wSpan - 1));
                                const slotHeight = (BASE_HEIGHT * hSpan) + (GAP_SIZE * (hSpan - 1));

                                const item = slot.items?.[0];
                                const isPicked = pickedSlotId === slot.id;

                                return (
                                    <View key={slot.id} style={{ position: 'relative' }}>
                                        <Pressable
                                            onPress={() => handleSlotPress(slot)}
                                            onLongPress={() => handleLongPress(slot)}
                                            delayLongPress={300}
                                            style={[
                                                styles.slot,
                                                { 
                                                    width: slotWidth,
                                                    height: slotHeight,
                                                    backgroundColor: item ? colors.card : 'rgba(255,255,255,0.05)',
                                                    borderColor: isPicked ? colors.primary : colors.border,
                                                    borderStyle: item ? 'solid' : 'dashed',
                                                    borderWidth: isPicked ? 2 : 1,
                                                    opacity: isPicked ? 0.5 : 1
                                                }
                                            ]}
                                        >
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

                                            {/* Delete Button (Small overlay in corner for Edit Mode) */}
                                            {isEditMode && !item && (
                                                <Pressable 
                                                    style={styles.miniDelete}
                                                    onPress={() => handleDeleteLocation(slot.id)}
                                                >
                                                    <Feather name="x" size={10} color="white" />
                                                </Pressable>
                                            )}
                                        </Pressable>

                                        {/* --- RESIZE HANDLES (Overlay) --- */}
                                        {isEditMode && !isPicked && (
                                            <>
                                                {/* Width Handle (Right) */}
                                                <ResizeHandle 
                                                    dimension="width" 
                                                    currentSpan={wSpan} 
                                                    slotId={slot.id} 
                                                    unitSize={UNIT_WIDTH} 
                                                />
                                                {/* Height Handle (Bottom) */}
                                                <ResizeHandle 
                                                    dimension="height" 
                                                    currentSpan={hSpan} 
                                                    slotId={slot.id} 
                                                    unitSize={BASE_HEIGHT} 
                                                />
                                            </>
                                        )}
                                    </View>
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
  rowWrapper: { marginBottom: 8, position: 'relative' },
  
  // Background Grid Lines
  backgroundGrid: {
      position: 'absolute',
      top: 0, bottom: 0, left: 0, right: 0,
      flexDirection: 'row',
      zIndex: -1,
  },
  backgroundGridCol: {
      borderWidth: 1,
      borderStyle: 'dashed',
      height: '100%',
      opacity: 0.2,
      borderRadius: 4
  },

  gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      // gap provided inline
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

  // Handles
  resizeHandle: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
      borderRadius: 10,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1,
  },
  resizeHandleRight: {
      right: -6,
      top: '35%',
      height: '30%',
      width: 14,
  },
  resizeHandleBottom: {
      bottom: -6,
      left: '35%',
      width: '30%',
      height: 14,
  },
  
  miniDelete: {
      position: 'absolute',
      top: 2,
      left: 2,
      backgroundColor: '#DC2626',
      borderRadius: 10,
      padding: 4,
      opacity: 0.8
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