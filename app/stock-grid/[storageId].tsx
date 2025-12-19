import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, useWindowDimensions, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useModal } from '../../providers/ModalProvider';
import { showError, showSuccess } from '../../lib/toast';
import { typography } from '../../styles/typography';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { logActivity } from '../../lib/logger';
import * as Haptics from 'expo-haptics';

// --- Data Types ---
type LocationSlot = {
  id: string; 
  master_id: string; // Now required, as it exists in DB
  shelf: string;
  row: string;
  column: string;
  width_span: number; 
  height_span: number;
  items: {
    id: string;
    name: string;
    quantity: number;
  }[] | null;
  _top?: number;
  _left?: number;
};

// Helper for Natural Sort
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
  const GAP_SIZE = 4;        
  const BASE_HEIGHT = 80;    

  // Precise Math
  const AVAILABLE_WIDTH = screenWidth - (GRID_PADDING * 2);
  const TOTAL_GAPS = GAP_SIZE * (TOTAL_GRID_COLS - 1);
  const UNIT_WIDTH = (AVAILABLE_WIDTH - TOTAL_GAPS) / TOTAL_GRID_COLS;

  const [locations, setLocations] = useState<LocationSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showGridLines, setShowGridLines] = useState(true);

  const fetchData = useCallback(async () => {
    if (!storageId) return;
    setLoading(true);
    try {
      // PERMANENT FIX: We now select master_id properly from the DB
      const { data, error } = await supabase
        .from('defined_locations')
        .select(`
          id, shelf, row, column, width_span, height_span, master_id,
          items ( id, name, quantity )
        `)
        .eq('storage_id', storageId);
        
      if (error) throw error;
      
      if (!data) {
          setLocations([]);
          return;
      }

      const formattedLocations = data.map(loc => ({
        ...loc,
        // Fallback: if DB update was missed, default to self, but ideally this comes from DB
        master_id: loc.master_id || loc.id, 
        width_span: loc.width_span || 1,
        height_span: loc.height_span || 1,
        items: loc.items || [],
      }));

      setLocations(formattedLocations as LocationSlot[]);

    } catch (err: any) {
      console.error("StockGrid Fetch Error:", err);
      showError(t('general.error'), err.message);
    } finally {
      setLoading(false);
    }
  }, [storageId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- MERGE LOGIC ---
  const handleMerge = async (sourceSlot: LocationSlot, direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    
    // Sort shelves to know order
    const allShelves = [...new Set(locations.map(l => l.shelf))].sort(naturalSort);
    const currentShelfIdx = allShelves.indexOf(sourceSlot.shelf);

    let neighbor: LocationSlot | undefined;

    const shelfSlots = locations.filter(l => l.shelf === sourceSlot.shelf);
    const uniqueCols = [...new Set(shelfSlots.map(l => l.column))].sort(naturalSort);
    const uniqueRows = [...new Set(shelfSlots.map(l => l.row))].sort(naturalSort);
    
    const colIdx = uniqueCols.indexOf(sourceSlot.column);
    const rowIdx = uniqueRows.indexOf(sourceSlot.row);

    if (direction === 'RIGHT') {
        if (colIdx < uniqueCols.length - 1) {
            const nextCol = uniqueCols[colIdx + 1];
            neighbor = shelfSlots.find(l => l.row === sourceSlot.row && l.column === nextCol);
        }
    } else if (direction === 'LEFT') {
        if (colIdx > 0) {
            const prevCol = uniqueCols[colIdx - 1];
            neighbor = shelfSlots.find(l => l.row === sourceSlot.row && l.column === prevCol);
        }
    } else if (direction === 'DOWN') {
        if (rowIdx < uniqueRows.length - 1) {
            // Same shelf down
            const nextRow = uniqueRows[rowIdx + 1];
            neighbor = shelfSlots.find(l => l.column === sourceSlot.column && l.row === nextRow);
        } else if (currentShelfIdx < allShelves.length - 1) {
            // Next shelf top row
            const nextShelf = allShelves[currentShelfIdx + 1];
            const nextShelfSlots = locations.filter(l => l.shelf === nextShelf);
            const nextShelfRows = [...new Set(nextShelfSlots.map(l => l.row))].sort(naturalSort);
            const nextShelfCols = [...new Set(nextShelfSlots.map(l => l.column))].sort(naturalSort);
            
            if (colIdx < nextShelfCols.length && nextShelfRows.length > 0) {
                const targetCol = nextShelfCols[colIdx];
                const targetRow = nextShelfRows[0];
                neighbor = nextShelfSlots.find(l => l.column === targetCol && l.row === targetRow);
            }
        }
    } else if (direction === 'UP') {
        if (rowIdx > 0) {
            // Same shelf up
            const prevRow = uniqueRows[rowIdx - 1];
            neighbor = shelfSlots.find(l => l.column === sourceSlot.column && l.row === prevRow);
        } else if (currentShelfIdx > 0) {
            // Prev shelf bottom row
            const prevShelf = allShelves[currentShelfIdx - 1];
            const prevShelfSlots = locations.filter(l => l.shelf === prevShelf);
            const prevShelfRows = [...new Set(prevShelfSlots.map(l => l.row))].sort(naturalSort);
            const prevShelfCols = [...new Set(prevShelfSlots.map(l => l.column))].sort(naturalSort);
            
            if (colIdx < prevShelfCols.length && prevShelfRows.length > 0) {
                const targetCol = prevShelfCols[colIdx];
                const targetRow = prevShelfRows[prevShelfRows.length - 1];
                neighbor = prevShelfSlots.find(l => l.column === targetCol && l.row === targetRow);
            }
        }
    }

    if (!neighbor) {
        Alert.alert("Error", "No location found in that direction.");
        return;
    }

    if (neighbor.master_id === sourceSlot.master_id) {
        Alert.alert("Already Merged", "These locations are already part of the same unit.");
        return;
    }

    const neighborItems = locations.filter(l => l.master_id === neighbor!.master_id).flatMap(l => l.items || []);
    const sourceItems = locations.filter(l => l.master_id === sourceSlot.master_id).flatMap(l => l.items || []);

    if (neighborItems.length > 0 && sourceItems.length > 0) {
        Alert.alert("Occupied", "Both locations contain items. Empty one before merging.");
        return;
    }

    // --- PERFORM MERGE ---
    const winningId = sourceSlot.master_id;
    const losingId = neighbor.master_id;

    // 1. Optimistic Update (Instant feedback)
    setLocations(prev => prev.map(l => {
        if (l.master_id === losingId) {
            return { ...l, master_id: winningId };
        }
        return l;
    }));

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 2. Database Update
    const { error } = await supabase
        .from('defined_locations')
        .update({ master_id: winningId })
        .eq('master_id', losingId);

    if (error) {
        showError("Merge failed", error.message);
        fetchData(); // Revert on failure
    }
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
        const uniqueRows = [...new Set(slots.map(l => l.row))].sort(naturalSort);
        const uniqueCols = [...new Set(slots.map(l => l.column))].sort(naturalSort);
        
        const mappedSlots = slots.map(slot => {
            const rowIdx = uniqueRows.indexOf(slot.row);
            const colIdx = uniqueCols.indexOf(slot.column);
            const top = (rowIdx * (BASE_HEIGHT + GAP_SIZE));
            const left = (colIdx * (UNIT_WIDTH + GAP_SIZE));

            return { ...slot, _top: top, _left: left };
        });

        const rowCount = uniqueRows.length;
        const totalHeight = (rowCount * BASE_HEIGHT) + ((rowCount - 1) * GAP_SIZE);

        return {
            shelfLabel: shelfKey,
            totalHeight: Math.max(totalHeight, BASE_HEIGHT),
            mappedSlots,
            rowCount
        };
    });
  }, [locations, BASE_HEIGHT, GAP_SIZE, UNIT_WIDTH]);


  // --- COMPONENT: Merge Handle ---
  const MergeHandle = ({ direction, onPress }: { direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', onPress: () => void }) => {
    let style = {};
    const offset = -10; 
    if (direction === 'UP') style = { top: offset, left: '50%', marginLeft: -10 };
    if (direction === 'DOWN') style = { bottom: offset, left: '50%', marginLeft: -10 };
    if (direction === 'LEFT') style = { left: offset, top: '50%', marginTop: -10 };
    if (direction === 'RIGHT') style = { right: offset, top: '50%', marginTop: -10 };

    return (
        <TouchableOpacity 
            style={[styles.mergeHandle, style, { backgroundColor: colors.card, borderColor: colors.primary }]} 
            onPress={onPress}
            activeOpacity={0.7}
        >
            <MaterialCommunityIcons name="link-variant" size={12} color={colors.primary} />
        </TouchableOpacity>
    );
  };

  // --- COMPONENT: Slot ---
  const SlotComponent = ({ slot, allLocations, shelfLabel }: { slot: LocationSlot, allLocations: LocationSlot[], shelfLabel: string }) => {
      
      const getNeighborMaster = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
          const shelfLocs = allLocations.filter(l => l.shelf === shelfLabel);
          const cols = [...new Set(shelfLocs.map(l => l.column))].sort(naturalSort);
          const rows = [...new Set(shelfLocs.map(l => l.row))].sort(naturalSort);
          const rIdx = rows.indexOf(slot.row);
          const cIdx = cols.indexOf(slot.column);
          
          if (dir === 'RIGHT' && cIdx < cols.length - 1) return shelfLocs.find(l => l.row === slot.row && l.column === cols[cIdx+1])?.master_id;
          if (dir === 'LEFT' && cIdx > 0) return shelfLocs.find(l => l.row === slot.row && l.column === cols[cIdx-1])?.master_id;
          if (dir === 'DOWN' && rIdx < rows.length - 1) return shelfLocs.find(l => l.column === slot.column && l.row === rows[rIdx+1])?.master_id;
          if (dir === 'UP' && rIdx > 0) return shelfLocs.find(l => l.column === slot.column && l.row === rows[rIdx-1])?.master_id;
          
          // Cross shelf visual checks
          if (dir === 'DOWN' || dir === 'UP') {
              const shelves = [...new Set(allLocations.map(l => l.shelf))].sort(naturalSort);
              const sIdx = shelves.indexOf(shelfLabel);
              
              if (dir === 'DOWN' && sIdx < shelves.length - 1) {
                  const nextShelfLocs = allLocations.filter(l => l.shelf === shelves[sIdx+1]);
                  const nextCols = [...new Set(nextShelfLocs.map(l => l.column))].sort(naturalSort);
                  const nextRows = [...new Set(nextShelfLocs.map(l => l.row))].sort(naturalSort);
                  if (cIdx < nextCols.length && nextRows.length > 0) {
                      return nextShelfLocs.find(l => l.column === nextCols[cIdx] && l.row === nextRows[0])?.master_id;
                  }
              }
              if (dir === 'UP' && sIdx > 0) {
                   const prevShelfLocs = allLocations.filter(l => l.shelf === shelves[sIdx-1]);
                   const prevCols = [...new Set(prevShelfLocs.map(l => l.column))].sort(naturalSort);
                   const prevRows = [...new Set(prevShelfLocs.map(l => l.row))].sort(naturalSort);
                   if (cIdx < prevCols.length && prevRows.length > 0) {
                       return prevShelfLocs.find(l => l.column === prevCols[cIdx] && l.row === prevRows[prevRows.length-1])?.master_id;
                   }
              }
          }
          return null;
      };

      const isMergedRight = getNeighborMaster('RIGHT') === slot.master_id;
      const isMergedLeft = getNeighborMaster('LEFT') === slot.master_id;
      const isMergedDown = getNeighborMaster('DOWN') === slot.master_id;
      const isMergedUp = getNeighborMaster('UP') === slot.master_id;

      const groupMembers = allLocations.filter(l => l.master_id === slot.master_id);
      const sortedGroup = groupMembers.sort((a,b) => {
          if (a.shelf !== b.shelf) return naturalSort(a.shelf, b.shelf);
          if (a.row !== b.row) return naturalSort(a.row, b.row);
          return naturalSort(a.column, b.column);
      });
      const isLeader = sortedGroup[0].id === slot.id;
      const masterItem = slot.items?.[0] || sortedGroup.flatMap(g => g.items || [])[0];

      return (
        <View style={{
            position: 'absolute',
            top: slot._top,
            left: slot._left,
            width: UNIT_WIDTH,
            height: BASE_HEIGHT,
            zIndex: isLeader ? 10 : 1
        }}>
            <Pressable
                onPress={() => handleSlotPress(slot)}
                style={[
                    styles.slotBase,
                    { 
                        backgroundColor: masterItem ? colors.card : 'rgba(128,128,128,0.1)',
                        borderColor: colors.border,
                        borderStyle: masterItem ? 'solid' : 'dashed',
                        borderRightWidth: isMergedRight ? 0 : 1,
                        borderLeftWidth: isMergedLeft ? 0 : 1,
                        borderTopWidth: isMergedUp ? 0 : 1,
                        borderBottomWidth: isMergedDown ? 0 : 1,
                    }
                ]}
            >
                {isMergedRight && <View style={[styles.gapFillerRight, { backgroundColor: masterItem ? colors.card : 'rgba(128,128,128,0.1)' }]} />}
                {isMergedDown && <View style={[styles.gapFillerDown, { backgroundColor: masterItem ? colors.card : 'rgba(128,128,128,0.1)' }]} />}
                
                {isLeader && masterItem && (
                    <View style={styles.contentContainer}>
                        <View style={[styles.quantityBadge, { backgroundColor: masterItem.quantity > 0 ? colors.selector : colors.danger }]}>
                            <Text style={styles.quantityText}>{masterItem.quantity}</Text>
                        </View>
                        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                            {masterItem.name}
                        </Text>
                    </View>
                )}
                 {isLeader && !masterItem && (
                    <View style={[styles.emptyMarker, { backgroundColor: colors.border }]} />
                )}

                 {isEditMode && isLeader && !masterItem && (
                    <Pressable style={styles.miniDelete} onPress={() => handleDeleteLocation(slot.id)}>
                        <Feather name="x" size={10} color="white" />
                    </Pressable>
                )}
            </Pressable>

            {isEditMode && (
                <>
                    {!isMergedUp && <MergeHandle direction="UP" onPress={() => handleMerge(slot, 'UP')} />}
                    {!isMergedDown && <MergeHandle direction="DOWN" onPress={() => handleMerge(slot, 'DOWN')} />}
                    {!isMergedLeft && <MergeHandle direction="LEFT" onPress={() => handleMerge(slot, 'LEFT')} />}
                    {!isMergedRight && <MergeHandle direction="RIGHT" onPress={() => handleMerge(slot, 'RIGHT')} />}
                </>
            )}
        </View>
      );
  };

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
      const groupMembers = locations.filter(l => l.master_id === slot.master_id);
      const item = groupMembers.flatMap(g => g.items || [])[0];

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
                style={[styles.iconButton, { backgroundColor: isEditMode ? colors.primary : colors.card, borderColor: colors.selector, borderWidth: 1 }]} 
                onPress={toggleEditMode}
            >
                <Feather name={isEditMode ? "check" : "edit-2"} size={20} color={isEditMode ? colors.primaryText : colors.text} />
            </Pressable>
            <Pressable style={[styles.iconButton, { backgroundColor: colors.danger }]} onPress={() => router.back()}>
                <Feather name="x" size={20} color="white" />
            </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ padding: GRID_PADDING }}>
          {visualGrid.map((shelf) => (
            <View 
                key={shelf.shelfLabel} 
                style={[styles.shelfContainer, { borderColor: colors.border }]}
            >
              <View style={[styles.shelfContent, { height: shelf.totalHeight }]}>
                {isEditMode && showGridLines && (
                  <View style={styles.backgroundGridOverlay} pointerEvents="none">
                      {Array.from({ length: TOTAL_GRID_COLS }).map((_, i) => (
                          <View 
                            key={`v-${i}`} 
                            style={[ styles.gridLine, { borderColor: colors.text, left: (i * (UNIT_WIDTH + GAP_SIZE)) + UNIT_WIDTH + (GAP_SIZE / 2) } ]} 
                          />
                      ))}
                      {Array.from({ length: shelf.rowCount - 1 }).map((_, i) => (
                          <View 
                            key={`h-${i}`} 
                            style={[ styles.gridLineHorizontal, { borderColor: colors.text, top: (i * (BASE_HEIGHT + GAP_SIZE)) + BASE_HEIGHT + (GAP_SIZE / 2) } ]} 
                          />
                      ))}
                  </View>
                )}

                {shelf.mappedSlots.map((slot) => (
                    <SlotComponent 
                        key={slot.id} 
                        slot={slot} 
                        allLocations={locations} 
                        shelfLabel={shelf.shelfLabel} 
                    />
                ))}
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
  
  shelfContainer: { 
      position: 'relative', 
      marginBottom: 0, 
  }, 
  
  shelfContent: { width: '100%', position: 'relative', overflow: 'visible' },
  
  slotBase: {
      width: '100%', height: '100%',
      justifyContent: 'center', alignItems: 'center',
      borderRadius: 4, 
      borderWidth: 1,
      overflow: 'visible' 
  },
  gapFillerRight: {
      position: 'absolute',
      right: -6, 
      top: 0,
      bottom: 0,
      width: 6,
      zIndex: 1
  },
  gapFillerDown: {
      position: 'absolute',
      bottom: -6, 
      left: 0,
      right: 0,
      height: 6,
      zIndex: 1
  },
  
  contentContainer: { alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },

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
  itemName: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 12, paddingHorizontal: 2 },

  mergeHandle: {
    position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 1, 
    justifyContent: 'center', alignItems: 'center', zIndex: 9999, elevation: 10
  },
  miniDelete: { position: 'absolute', top: 2, left: 2, backgroundColor: '#DC2626', borderRadius: 10, padding: 4, opacity: 0.8, zIndex: 60 },
});