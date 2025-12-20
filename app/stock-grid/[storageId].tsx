import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, useWindowDimensions, Alert, TouchableOpacity, Platform, StatusBar } from 'react-native';
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
  master_id: string; 
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

  // --- DYNAMIC LAYOUT CALCULATION ---
  const { width: screenWidth, height: screenHeight } = useWindowDimensions(); 
  
  // 1. Determine Orientation
  const isLandscape = screenWidth > screenHeight;

  // 2. Define Constraints based on Orientation
  const VISIBLE_COLS = isLandscape ? 7 : 6; 
  const GRID_PADDING = 12; 
  const GAP_SIZE = 4;

  // 3. Calculate Unit Width (Columns)
  // We force exactly 'VISIBLE_COLS' to fit in the screen width. 
  // If data has more cols, it will overflow and scroll.
  const AVAILABLE_WIDTH = screenWidth - (GRID_PADDING * 2);
  const TOTAL_GAPS_W = GAP_SIZE * (VISIBLE_COLS - 1);
  const UNIT_WIDTH = (AVAILABLE_WIDTH - TOTAL_GAPS_W) / VISIBLE_COLS;

  // 4. Calculate Base Height (Rows)
  // In Portrait: Fixed 80px.
  // In Landscape: Calculate height so exactly 7 shelves fit vertically.
  const AVAILABLE_HEIGHT = screenHeight - (GRID_PADDING * 2); 
  // Subtracting a small buffer (e.g., 20) for safety/margins in landscape
  const TOTAL_GAPS_H = GAP_SIZE * (7 - 1); 
  const BASE_HEIGHT = isLandscape 
      ? Math.floor((AVAILABLE_HEIGHT - TOTAL_GAPS_H - 20) / 7) 
      : 80;

  const [locations, setLocations] = useState<LocationSlot[]>([]);
  const [originalSnapshot, setOriginalSnapshot] = useState<LocationSlot[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [showGridLines, setShowGridLines] = useState(true); 

  // --- MENU STATE ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!storageId) return;
    setLoading(true);
    try {
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

  // --- ACTIONS: SAVE / CANCEL ---

  const handleSaveChanges = async () => {
      setIsMenuOpen(false);
      setLoading(true);
      try {
          const currentIds = new Set(locations.map(l => l.id));
          const deletedIds = originalSnapshot.filter(l => !currentIds.has(l.id)).map(l => l.id);

          if (deletedIds.length > 0) {
              const { error } = await supabase.from('defined_locations').delete().in('id', deletedIds);
              if (error) throw error;
          }

          const changedItems = locations.filter(curr => {
              const orig = originalSnapshot.find(o => o.id === curr.id);
              return orig && orig.master_id !== curr.master_id;
          });

          if (changedItems.length > 0) {
              const updatePromises = changedItems.map(item => 
                  supabase.from('defined_locations').update({ master_id: item.master_id }).eq('id', item.id)
              );
              await Promise.all(updatePromises);
          }

          showSuccess(t('general.success'), "Layout changes saved.");
          setIsEditMode(false);
          setOriginalSnapshot([]); 
          fetchData(); 

      } catch (err: any) {
          showError(t('general.error'), err.message);
          setLoading(false);
      }
  };

  const handleCancelChanges = () => {
      if (originalSnapshot.length > 0) {
          setLocations(JSON.parse(JSON.stringify(originalSnapshot)));
      }
      setIsEditMode(false);
      setIsMenuOpen(false);
      setOriginalSnapshot([]);
      showSuccess(t('general.info'), "Changes discarded");
  };

  const toggleEditMode = () => {
      setIsMenuOpen(false);
      if (isEditMode) {
          Alert.alert(
              t('general.confirm'),
              "Do you want to save your changes?",
              [
                  { text: "Discard", style: "destructive", onPress: handleCancelChanges },
                  { text: "Save", onPress: handleSaveChanges }
              ]
          );
      } else {
          showPasscodeModal({
              title: t('stockGrid.passcodeTitle'),
              message: t('stockGrid.passcodeMessage'),
              onSubmit: (passcode) => {
                  if (passcode === workgroup?.admin_passcode) {
                      setOriginalSnapshot(JSON.parse(JSON.stringify(locations)));
                      setIsEditMode(true);
                      showSuccess(t('stockGrid.editModeEnabled'));
                  } else {
                      showError(t('stockGrid.invalidPasscode'));
                  }
              },
          });
      }
  };

  // --- LOCAL ACTIONS ---

  const handleMerge = async (sourceSlot: LocationSlot, direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    
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
            const nextRow = uniqueRows[rowIdx + 1];
            neighbor = shelfSlots.find(l => l.column === sourceSlot.column && l.row === nextRow);
        } else if (currentShelfIdx < allShelves.length - 1) {
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
            const prevRow = uniqueRows[rowIdx - 1];
            neighbor = shelfSlots.find(l => l.column === sourceSlot.column && l.row === prevRow);
        } else if (currentShelfIdx > 0) {
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

    // --- PERFORM MERGE (LOCAL) ---
    const winningId = sourceSlot.master_id;
    const losingId = neighbor.master_id;

    setLocations(prev => prev.map(l => {
        if (l.master_id === losingId) {
            return { ...l, master_id: winningId };
        }
        return l;
    }));

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleDeleteLocation = (id: string) => {
      Alert.alert(
          t('general.delete'),
          "Delete this location? This will be applied when you Save.",
          [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => {
                   setLocations(prev => prev.filter(l => l.id !== id));
              }}
          ]
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
        const colCount = uniqueCols.length;
        const totalHeight = (rowCount * BASE_HEIGHT) + ((rowCount - 1) * GAP_SIZE);

        return {
            shelfLabel: shelfKey,
            totalHeight: Math.max(totalHeight, BASE_HEIGHT),
            mappedSlots,
            rowCount,
            colCount 
        };
    });
  }, [locations, BASE_HEIGHT, GAP_SIZE, UNIT_WIDTH]);

  // --- Calculate Content Width ---
  // If the actual data has more columns than VISIBLE_COLS, the grid grows.
  const maxGridColumns = useMemo(() => {
      if (visualGrid.length === 0) return VISIBLE_COLS;
      const maxColsInShelves = Math.max(...visualGrid.map(s => s.colCount));
      return Math.max(VISIBLE_COLS, maxColsInShelves);
  }, [visualGrid, VISIBLE_COLS]);

  const contentWidth = useMemo(() => {
     return (maxGridColumns * UNIT_WIDTH) + ((maxGridColumns - 1) * GAP_SIZE) + (GRID_PADDING * 2);
  }, [maxGridColumns, UNIT_WIDTH, GAP_SIZE, GRID_PADDING]);


  // --- COMPONENT: Merge Handle ---
  const MergeHandle = ({ direction, onPress }: { direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', onPress: () => void }) => {
    let style = {};
    const offset = -12; 
    
    if (direction === 'UP') style = { top: offset, left: '50%', marginLeft: -12 };
    if (direction === 'DOWN') style = { bottom: offset, left: '50%', marginLeft: -12 };
    if (direction === 'LEFT') style = { left: offset, top: '50%', marginTop: -12 };
    if (direction === 'RIGHT') style = { right: offset, top: '50%', marginTop: -12 };

    const isVerticalMerge = direction === 'UP' || direction === 'DOWN';

    return (
        <TouchableOpacity 
            style={[styles.mergeHandle, style]} 
            onPress={onPress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
            <MaterialCommunityIcons 
                name="equal" 
                size={18} 
                color={colors.primary} 
                style={{ 
                    transform: [{ rotate: isVerticalMerge ? '90deg' : '0deg' }]
                }}
            />
        </TouchableOpacity>
    );
  };

  // --- COMPONENT: Slot ---
  const SlotComponent = ({ slot, allLocations, shelfLabel, showGrid }: { slot: LocationSlot, allLocations: LocationSlot[], shelfLabel: string, showGrid: boolean }) => {
      
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

      const slotBackgroundColor = masterItem 
          ? colors.card 
          : showGrid 
              ? colors.background 
              : 'rgba(128,128,128,0.1)';

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
                        backgroundColor: slotBackgroundColor,
                        borderColor: showGrid ? 'transparent' : colors.border,
                        borderStyle: masterItem ? 'solid' : 'dashed',
                        borderRightWidth: isMergedRight ? 0 : 1,
                        borderLeftWidth: isMergedLeft ? 0 : 1,
                        borderTopWidth: isMergedUp ? 0 : 1,
                        borderBottomWidth: isMergedDown ? 0 : 1,
                    }
                ]}
            >
                {isMergedRight && <View style={[styles.gapFillerRight, { backgroundColor: slotBackgroundColor }]} />}
                {isMergedDown && <View style={[styles.gapFillerDown, { backgroundColor: slotBackgroundColor }]} />}
                
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
                 {isLeader && !masterItem && !showGrid && (
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

  if (loading) return <ActivityIndicator style={styles.centered} size="large" color={colors.primary} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Grid Content */}
      <ScrollView contentContainerStyle={{ paddingTop: 40, paddingBottom: 100 }}>
        <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
            
            <View style={{ 
                width: Math.max(screenWidth, contentWidth), 
                padding: GRID_PADDING,
                backgroundColor: showGridLines ? colors.border : 'transparent' 
            }}>
            {visualGrid.map((shelf) => (
                <View 
                    key={shelf.shelfLabel} 
                    style={[
                        styles.shelfContainer, 
                        { 
                            marginBottom: GAP_SIZE,
                            borderColor: colors.border
                        }
                    ]}
                >
                <View style={[styles.shelfContent, { height: shelf.totalHeight }]}>
                    {shelf.mappedSlots.map((slot) => (
                        <SlotComponent 
                            key={slot.id} 
                            slot={slot} 
                            allLocations={locations} 
                            shelfLabel={shelf.shelfLabel} 
                            showGrid={showGridLines}
                        />
                    ))}
                </View>
                </View>
            ))}
            </View>
        </ScrollView>
      </ScrollView>

      {/* --- MENU OVERLAY --- */}
      {isMenuOpen && (
          <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
             
             {!isEditMode && (
                 <>
                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={() => { setShowGridLines(!showGridLines); }} 
                    >
                        <MaterialIcons name="grid-on" size={18} color={showGridLines ? colors.primary : colors.text} />
                        <Text style={[styles.menuText, { color: colors.text }]}>
                            {showGridLines ? 'Hide Grid' : 'Show Grid'}
                        </Text>
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={toggleEditMode}
                    >
                        <Feather name="edit-2" size={18} color={colors.text} />
                        <Text style={[styles.menuText, { color: colors.text }]}>{t('general.edit', 'Edit Layout')}</Text>
                    </TouchableOpacity>
                    
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    
                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={() => router.back()}
                    >
                        <Feather name="log-out" size={18} color={colors.danger} />
                        <Text style={[styles.menuText, { color: colors.danger }]}>{t('general.exit', 'Exit')}</Text>
                    </TouchableOpacity>
                 </>
             )}

             {isEditMode && (
                 <>
                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={() => { setShowGridLines(!showGridLines); }} 
                    >
                        <MaterialIcons name="grid-on" size={18} color={showGridLines ? colors.primary : colors.text} />
                        <Text style={[styles.menuText, { color: colors.text }]}>
                            {showGridLines ? 'Hide Grid' : 'Show Grid'}
                        </Text>
                    </TouchableOpacity>
                    
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={handleSaveChanges}
                    >
                        <Feather name="check" size={18} color={colors.success} />
                        <Text style={[styles.menuText, { color: colors.text }]}>{t('general.save', 'Accept')}</Text>
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={handleCancelChanges}
                    >
                        <Feather name="x" size={18} color={colors.danger} />
                        <Text style={[styles.menuText, { color: colors.text }]}>{t('general.cancel', 'Stop (Cancel)')}</Text>
                    </TouchableOpacity>
                 </>
             )}

          </View>
      )}

      {/* --- FAB --- */}
      <TouchableOpacity 
         style={[styles.fab, { backgroundColor: colors.card, borderColor: colors.border }]}
         onPress={() => setIsMenuOpen(!isMenuOpen)}
         activeOpacity={0.8}
      >
          <Feather name={isMenuOpen ? "x" : "menu"} size={24} color={colors.text} />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  
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

  emptyMarker: { width: 8, height: 8, borderRadius: 4 },
  quantityBadge: {
    position: 'absolute', top: 4, right: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 20, alignItems: 'center',
  },
  quantityText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  itemName: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 12, paddingHorizontal: 2 },

  mergeHandle: {
    position: 'absolute', width: 24, height: 24, 
    justifyContent: 'center', alignItems: 'center', zIndex: 9999,
  },
  miniDelete: { position: 'absolute', top: 2, left: 2, backgroundColor: '#DC2626', borderRadius: 10, padding: 4, opacity: 0.8, zIndex: 60 },

  fab: {
      position: 'absolute',
      bottom: 30,
      right: 20,
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      opacity: 0.9, 
      borderWidth: 1,
  },
  menuContainer: {
      position: 'absolute',
      bottom: 90, 
      right: 20,
      width: 160,
      borderRadius: 12,
      paddingVertical: 5,
      zIndex: 10000,
      elevation: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      borderWidth: 1,
  },
  menuItem: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: 16,
      gap: 10,
  },
  menuText: {
      fontSize: 14,
      fontWeight: '600',
  },
  divider: {
      height: 1,
      width: '100%',
      opacity: 0.5,
  }
});