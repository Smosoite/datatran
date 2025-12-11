import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, useWindowDimensions, Alert } from 'react-native';
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
  const GAP_SIZE = 4;      
  const BASE_HEIGHT = 80;  

  // Precise Math
  const AVAILABLE_WIDTH = screenWidth - (GRID_PADDING * 2);
  const TOTAL_GAPS = GAP_SIZE * (TOTAL_GRID_COLS - 1);
  const UNIT_WIDTH = (AVAILABLE_WIDTH - TOTAL_GAPS) / TOTAL_GRID_COLS;

  const [locations, setLocations] = useState<LocationSlot[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- EDIT MODE STATE ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [showGridLines, setShowGridLines] = useState(true);
  const [pickedSlotId, setPickedSlotId] = useState<string | null>(null);

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

  // --- MERGE / RESIZE LOGIC ---
  const handleResizeComplete = async (slotId: string, dimension: 'width' | 'height', direction: number) => {
    const slot = locations.find(l => l.id === slotId);
    if (!slot) return;

    // --- SHRINKING ---
    if (direction < 0) {
        const newSpan = dimension === 'width' 
            ? Math.max(1, slot.width_span - 1)
            : Math.max(1, slot.height_span - 1);
        
        if (newSpan === (dimension === 'width' ? slot.width_span : slot.height_span)) return;

        setLocations(prev => prev.map(l => l.id === slotId ? { 
            ...l, 
            width_span: dimension === 'width' ? newSpan : l.width_span,
            height_span: dimension === 'height' ? newSpan : l.height_span
        } : l));
        
        await supabase.from('defined_locations').update(
            dimension === 'width' ? { width_span: newSpan } : { height_span: newSpan }
        ).eq('id', slotId);
        
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
    }

    // --- EXPANDING ---
    let victimId: string | null = null;
    
    if (dimension === 'width') {
        // Find visual neighbors in the same row
        const sameRow = locations.filter(l => l.shelf === slot.shelf && l.row === slot.row && l.id !== slot.id);
        const sortedRow = sameRow.sort((a, b) => (a.column || '').localeCompare(b.column || '', undefined, { numeric: true }));
        
        // Find slot immediately to the "right" based on sort order
        const neighbors = sortedRow.filter(l => (l.column || '').localeCompare(slot.column || '', undefined, { numeric: true }) > 0);
        const victim = neighbors[0]; 

        if (victim) {
            if (victim.items && victim.items.length > 0) {
                Alert.alert(t('general.error'), t('stockGrid.mergeError', 'Cannot merge: Neighbor has items.'));
                return;
            }
            victimId = victim.id;
        }
    } else {
        // Height Logic
        const shelfSlots = locations.filter(l => l.shelf === slot.shelf);
        const rows = [...new Set(shelfSlots.map(l => l.row))].sort((a,b) => (a||'').localeCompare(b||'', undefined, {numeric:true}));
        const currentRowIndex = rows.indexOf(slot.row);
        
        if (currentRowIndex < rows.length - 1) {
            const nextRowName = rows[currentRowIndex + 1];
            const victim = shelfSlots.find(l => l.row === nextRowName && l.column === slot.column);
            if (victim) {
                if (victim.items && victim.items.length > 0) {
                    Alert.alert(t('general.error'), t('stockGrid.mergeError', 'Cannot merge: Neighbor has items.'));
                    return;
                }
                victimId = victim.id;
            }
        }
    }

    // --- EXECUTE UPDATE ---
    if (victimId) {
        // Case A: Merge with Victim
        const newLocs = locations.filter(l => l.id !== victimId).map(l => {
            if (l.id === slotId) {
                return {
                    ...l,
                    width_span: dimension === 'width' ? l.width_span + 1 : l.width_span,
                    height_span: dimension === 'height' ? l.height_span + 1 : l.height_span
                };
            }
            return l;
        });

        setLocations(newLocs);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        await supabase.from('defined_locations').delete().eq('id', victimId);
        await supabase.from('defined_locations').update(
            dimension === 'width' ? { width_span: slot.width_span + 1 } : { height_span: slot.height_span + 1 }
        ).eq('id', slotId);

    } else {
        // Case B: Expand into Void (Empty Space)
        // If no neighbor exists, but we are within limits (e.g. 6 cols wide), allow expansion.
        const currentVal = dimension === 'width' ? slot.width_span : slot.height_span;
        const maxVal = dimension === 'width' ? TOTAL_GRID_COLS : 6; 

        if (currentVal < maxVal) {
             const newVal = currentVal + 1;
             
             setLocations(prev => prev.map(l => l.id === slotId ? { 
                ...l, 
                width_span: dimension === 'width' ? newVal : l.width_span,
                height_span: dimension === 'height' ? newVal : l.height_span
            } : l));

            await supabase.from('defined_locations').update(
                dimension === 'width' ? { width_span: newVal } : { height_span: newVal }
            ).eq('id', slotId);
            
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
            Alert.alert(t('general.limit', 'Limit Reached'), t('stockGrid.maxSize', 'Maximum size reached.'));
        }
    }
  };


  // --- GESTURE COMPONENT ---
  const ResizeHandle = ({ 
    dimension, 
    slotId
  }: { 
    dimension: 'width' | 'height', 
    slotId: string
  }) => {
    const isHorizontal = dimension === 'width';
    
    const pan = Gesture.Pan()
        .runOnJS(true)
        .onEnd((e) => {
            const dragDist = isHorizontal ? e.translationX : e.translationY;
            if (Math.abs(dragDist) > 30) {
                const direction = dragDist > 0 ? 1 : -1;
                handleResizeComplete(slotId, dimension, direction);
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
                <View style={{ 
                    width: isHorizontal ? 4 : 20, 
                    height: isHorizontal ? 20 : 4, 
                    backgroundColor: 'white', 
                    borderRadius: 2 
                }} />
            </View>
        </GestureDetector>
    );
  };

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
        message: t('stockGrid.enterPasscode', 'Enter Admin Passcode'),
        onSubmit: (passcode) => {
          if (passcode === workgroup?.admin_passcode) {
            setIsEditMode(true);
            showSuccess(t('stockGrid.editModeEnabled'));
          } else {
            showError(t('stockGrid.invalidPasscode'));
          }
        },
      });
    }
  };

  const handleSlotPress = (slot: LocationSlot) => {
    if (!isEditMode) {
      const item = slot.items?.[0];
      if (item) {
        showQuantityModal({
          title: item.name,
          message: `${t('stockGrid.currentQty')}: ${item.quantity}`,
          confirmText: t('general.remove'),
          cancelText: t('general.cancel'),
          onSubmit: async (qty) => {
             const newQuantity = item.quantity - qty;
             if (newQuantity < 0) return showError(t('general.error'));
             await supabase.from('items').update({ quantity: newQuantity }).eq('id', item.id);
             if (workgroup?.id) logActivity({ workgroup_id: workgroup.id, item_id: item.id, item_name: item.name, action: 'REMOVE', change_amount: -qty, final_quantity: newQuantity });
             fetchData();
          }
        });
      }
      return;
    }
  };

  const handleDeleteLocation = (id: string) => {
     showPasscodeModal({
        title: t('general.confirm'),
        message: t('stockGrid.deleteMsg', 'Delete location?'),
        onSubmit: async (passcode) => {
            if (passcode === workgroup?.admin_passcode) {
                await supabase.from('defined_locations').delete().eq('id', id);
                fetchData();
            }
        }
     });
  };

  if (loading) return <ActivityIndicator style={styles.centered} size="large" color={colors.primary} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
             <Text style={[typography.h2, { color: colors.text }]}>{t('stockGrid.title')}</Text>
             {isEditMode && <Text style={[typography.caption, { color: colors.primary, fontWeight: 'bold' }]}>EDITING LAYOUT</Text>}
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
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

      {/* SCROLLABLE GRID */}
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ padding: GRID_PADDING }}>
          {visualGrid.map((shelf) => (
            <View key={shelf.shelfLabel} style={[styles.shelfContainer, { borderColor: colors.border }]}>
              
              <View style={[styles.shelfLabelTab, { backgroundColor: colors.border }]}>
                <Text style={[styles.shelfLabelText, { color: colors.text }]}>{shelf.shelfLabel}</Text>
              </View>

              <View style={styles.shelfContent}>
                
                {/* --- BACKGROUND GRID LINES (Moved inside relative container) --- */}
                {isEditMode && showGridLines && (
                  <View style={styles.backgroundGridOverlay} pointerEvents="none">
                      {Array.from({ length: TOTAL_GRID_COLS }).map((_, i) => (
                          <View 
                            key={i} 
                            style={[
                                styles.gridLine, 
                                { 
                                    borderColor: colors.text, // High contrast
                                    left: (i * (UNIT_WIDTH + GAP_SIZE)) + UNIT_WIDTH + (GAP_SIZE / 2) - 0.5 // Center in gap
                                }
                            ]} 
                          />
                      ))}
                  </View>
                )}

                {shelf.rows.map((row) => (
                    <View key={row.rowLabel} style={styles.rowWrapper}>
                         <View style={[styles.gridContainer, { gap: GAP_SIZE }]}>
                            {row.slots.map((slot) => {
                                // CALC DIMENSIONS
                                const wSpan = slot.width_span || 1;
                                const hSpan = slot.height_span || 1;
                                const slotWidth = (UNIT_WIDTH * wSpan) + (GAP_SIZE * (wSpan - 1));
                                const slotHeight = (BASE_HEIGHT * hSpan) + (GAP_SIZE * (hSpan - 1));
                                const item = slot.items?.[0];

                                return (
                                    <View key={slot.id} style={{ position: 'relative', width: slotWidth, height: slotHeight }}>
                                        <Pressable
                                            onPress={() => handleSlotPress(slot)}
                                            style={[
                                                styles.slot,
                                                { 
                                                    width: '100%',
                                                    height: '100%',
                                                    backgroundColor: item ? colors.card : 'rgba(128,128,128,0.1)',
                                                    borderColor: colors.border,
                                                    borderStyle: item ? 'solid' : 'dashed',
                                                    borderWidth: 1,
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

                                            {isEditMode && !item && (
                                                <Pressable 
                                                    style={styles.miniDelete}
                                                    onPress={() => handleDeleteLocation(slot.id)}
                                                >
                                                    <Feather name="x" size={10} color="white" />
                                                </Pressable>
                                            )}
                                        </Pressable>

                                        {isEditMode && (
                                            <>
                                                <ResizeHandle dimension="width" slotId={slot.id} />
                                                <ResizeHandle dimension="height" slotId={slot.id} />
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
  shelfContainer: { marginBottom: 24, position: 'relative', marginTop: 20 },
  shelfLabelTab: {
    position: 'absolute',
    left: -10,
    top: -12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 20,
  },
  shelfLabelText: { fontWeight: 'bold', fontSize: 14 },
  shelfContent: { paddingHorizontal: 0, paddingTop: 10, position: 'relative' }, // relative for grid overlay
  shelfFloor: { height: 8, width: '100%', borderRadius: 4, marginTop: 4, opacity: 0.3 },
  rowWrapper: { marginBottom: 8 },
  
  gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
  },
  slot: {
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
    overflow: 'hidden',
  },
  
  // Background Grid Overlay
  backgroundGridOverlay: {
      position: 'absolute',
      top: 0, bottom: 0, left: 0, right: 0,
      zIndex: 0, 
  },
  gridLine: {
      position: 'absolute',
      top: 0, bottom: 0,
      width: 1,
      borderLeftWidth: 1,
      opacity: 0.2,
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

  resizeHandle: {
      position: 'absolute',
      zIndex: 50,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 4,
      elevation: 5,
  },
  resizeHandleRight: {
      right: -10, 
      top: '30%',
      height: '40%',
      width: 20,
  },
  resizeHandleBottom: {
      bottom: -10,
      left: '30%',
      width: '40%',
      height: 20,
  },
  miniDelete: {
      position: 'absolute',
      top: 2,
      left: 2,
      backgroundColor: '#DC2626',
      borderRadius: 10,
      padding: 4,
      opacity: 0.8,
      zIndex: 60
  },
});