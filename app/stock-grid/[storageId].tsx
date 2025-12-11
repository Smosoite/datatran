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
  // Computed for layout
  _top?: number;
  _left?: number;
  _zIndex?: number;
};

// Helper for Natural Sort (Row 1, Row 2, Row 10)
const naturalSort = (a: string | null, b: string | null) => {
    return (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' });
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
  const GAP_SIZE = 2;       // Tighter gap for better "merged" look
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

    // --- SHRINKING (Safe) ---
    if (direction < 0) {
        const newSpan = dimension === 'width' 
            ? Math.max(1, slot.width_span - 1)
            : Math.max(1, slot.height_span - 1);
        
        if (newSpan === (dimension === 'width' ? slot.width_span : slot.height_span)) return;

        // Apply Shrink
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

    // --- EXPANDING (Merge) ---
    const shelfSlots = locations.filter(l => l.shelf === slot.shelf);
    let victimId: string | null = null;

    if (dimension === 'width') {
        // --- WIDTH MERGE ---
        const rowSlots = shelfSlots
            .filter(l => l.row === slot.row)
            .sort((a,b) => naturalSort(a.column, b.column));
            
        const myIndex = rowSlots.findIndex(l => l.id === slot.id);
        
        // Check neighbor to the right
        if (myIndex !== -1 && myIndex < rowSlots.length - 1) {
            const potentialVictim = rowSlots[myIndex + 1];
            if (potentialVictim) {
                 if (potentialVictim.items && potentialVictim.items.length > 0) {
                    Alert.alert(t('general.error'), "Cannot merge: Neighbor is occupied.");
                    return;
                }
                victimId = potentialVictim.id;
            }
        }
    } else {
        // --- HEIGHT MERGE (FIXED) ---
        // Instead of calculating grid indices, we look for the next neighbor in the SAME COLUMN.
        const colSlots = shelfSlots
            .filter(l => l.column === slot.column)
            .sort((a,b) => naturalSort(a.row, b.row)); // Sort Top -> Bottom
            
        const myIndex = colSlots.findIndex(l => l.id === slot.id);

        // Check neighbor directly below
        if (myIndex !== -1 && myIndex < colSlots.length - 1) {
            const potentialVictim = colSlots[myIndex + 1];
            
            if (potentialVictim) {
                 if (potentialVictim.items && potentialVictim.items.length > 0) {
                    Alert.alert(t('general.error'), "Cannot merge: Neighbor is occupied.");
                    return;
                }
                victimId = potentialVictim.id;
            }
        } else {
             Alert.alert(t('general.limit'), "Bottom of shelf reached.");
             return;
        }
    }

    if (victimId) {
        // --- EXECUTE MERGE ---
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

    }
  };


  // --- GESTURE HANDLES ---
  const ResizeHandle = ({ dimension, slotId }: { dimension: 'width' | 'height', slotId: string }) => {
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
            <View style={[
                styles.resizeHandle,
                isHorizontal ? styles.resizeHandleRight : styles.resizeHandleBottom,
                { backgroundColor: colors.primary }
            ]}>
                 <View style={{ width: isHorizontal ? 4 : 20, height: isHorizontal ? 20 : 4, backgroundColor: 'white', borderRadius: 2 }} />
            </View>
        </GestureDetector>
    );
  };

  // --- VISUAL GRID CALCULATION ---
  const visualGrid = useMemo(() => {
    const shelvesDict: { [key: string]: LocationSlot[] } = {};
    locations.forEach(loc => {
      if (!shelvesDict[loc.shelf]) shelvesDict[loc.shelf] = [];
      shelvesDict[loc.shelf].push(loc);
    });

    const sortedShelfKeys = Object.keys(shelvesDict).sort(naturalSort);

    return sortedShelfKeys.map(shelfKey => {
        const slots = shelvesDict[shelfKey];
        
        // 1. Determine Grid Coordinates
        const uniqueRows = [...new Set(slots.map(l => l.row))].sort(naturalSort);
        const uniqueCols = [...new Set(slots.map(l => l.column))].sort(naturalSort);
        
        // 2. Map slots to Absolute Positions
        const mappedSlots = slots.map(slot => {
            const rowIdx = uniqueRows.indexOf(slot.row);
            const colIdx = uniqueCols.indexOf(slot.column);
            
            // Calculate Top/Left based on Unit Size + Gaps
            const top = (rowIdx * (BASE_HEIGHT + GAP_SIZE));
            const left = (colIdx * (UNIT_WIDTH + GAP_SIZE));

            return {
                ...slot,
                _top: top,
                _left: left,
                // Higher Z-Index for spans so they float over borders
                _zIndex: (slot.height_span > 1 || slot.width_span > 1) ? 100 : 1
            };
        });

        // Exact Height Calculation
        const totalHeight = (uniqueRows.length * BASE_HEIGHT) + ((uniqueRows.length - 1) * GAP_SIZE);

        return {
            shelfLabel: shelfKey,
            totalHeight: Math.max(totalHeight, BASE_HEIGHT), // Minimum 1 row height
            mappedSlots,
            rowCount: uniqueRows.length
        };
    });
  }, [locations, BASE_HEIGHT, GAP_SIZE, UNIT_WIDTH]);

  // --- ACTIONS ---
  const toggleEditMode = () => {
    if (isEditMode) {
      setIsEditMode(false);
    } else {
      showPasscodeModal({
        title: t('stockGrid.adminAccess'),
        message: t('stockGrid.enterPasscode'),
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
        message: t('stockGrid.deleteMsg'),
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

              <View style={[styles.shelfContent, { height: shelf.totalHeight }]}>
                
                {/* BACKGROUND GRID LINES */}
                {isEditMode && showGridLines && (
                  <View style={styles.backgroundGridOverlay} pointerEvents="none">
                      {/* Vertical Lines */}
                      {Array.from({ length: TOTAL_GRID_COLS }).map((_, i) => (
                          <View 
                            key={`v-${i}`} 
                            style={[
                                styles.gridLine, 
                                { 
                                    borderColor: colors.text, 
                                    left: (i * (UNIT_WIDTH + GAP_SIZE)) + UNIT_WIDTH + (GAP_SIZE / 2) 
                                }
                            ]} 
                          />
                      ))}
                      {/* Horizontal Lines */}
                      {Array.from({ length: shelf.rowCount - 1 }).map((_, i) => (
                          <View 
                            key={`h-${i}`} 
                            style={[
                                styles.gridLineHorizontal, 
                                { 
                                    borderColor: colors.text, 
                                    top: (i * (BASE_HEIGHT + GAP_SIZE)) + BASE_HEIGHT + (GAP_SIZE / 2) 
                                }
                            ]} 
                          />
                      ))}
                  </View>
                )}

                {/* SLOTS (Absolute Positioning) */}
                {shelf.mappedSlots.map((slot) => {
                      // Dimensions
                      const slotWidth = (UNIT_WIDTH * slot.width_span) + (GAP_SIZE * (slot.width_span - 1));
                      const slotHeight = (BASE_HEIGHT * slot.height_span) + (GAP_SIZE * (slot.height_span - 1));
                      const item = slot.items?.[0];

                      return (
                          <View 
                            key={slot.id} 
                            style={{ 
                                position: 'absolute',
                                top: slot._top,
                                left: slot._left,
                                width: slotWidth, 
                                height: slotHeight,
                                zIndex: slot._zIndex 
                            }}
                        >
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
                                    <Pressable style={styles.miniDelete} onPress={() => handleDeleteLocation(slot.id)}>
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
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 50, borderBottomWidth: 1, elevation: 2, zIndex: 10,
  },
  iconButton: { padding: 10, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  
  // FIXED: Reduced margins significantly to bring shelves closer
  shelfContainer: { marginBottom: 8, position: 'relative', marginTop: 12 }, 
  
  shelfLabelTab: {
    position: 'absolute', left: -10, top: -12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, zIndex: 20,
  },
  shelfLabelText: { fontWeight: 'bold', fontSize: 14 },
  shelfContent: { width: '100%', position: 'relative', marginTop: 10 },
  
  slot: { borderRadius: 6, justifyContent: 'center', alignItems: 'center', padding: 2, overflow: 'hidden' },
  
  backgroundGridOverlay: {
      position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 0, 
  },
  gridLine: {
      position: 'absolute', top: 0, bottom: 0, width: 1, borderLeftWidth: 1, borderStyle: 'solid', opacity: 0.2,
  },
  gridLineHorizontal: {
      position: 'absolute', left: 0, right: 0, height: 1, borderTopWidth: 1, borderStyle: 'solid', opacity: 0.2,
  },
  
  emptyMarker: { width: 8, height: 8, borderRadius: 4 },
  quantityBadge: {
    position: 'absolute', top: 4, right: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 20, alignItems: 'center',
  },
  quantityText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  itemName: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 12 },

  resizeHandle: { position: 'absolute', zIndex: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 4, elevation: 5 },
  resizeHandleRight: { right: -10, top: '30%', height: '40%', width: 20 },
  resizeHandleBottom: { bottom: -10, left: '30%', width: '40%', height: 20 },
  miniDelete: { position: 'absolute', top: 2, left: 2, backgroundColor: '#DC2626', borderRadius: 10, padding: 4, opacity: 0.8, zIndex: 60 },
});