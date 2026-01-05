import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { typography } from '../../styles/typography';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { showError } from '../../lib/toast';
import * as Haptics from 'expo-haptics';

// --- Types ---
type LocationSlot = {
  id: string; 
  master_id: string; 
  shelf: string;
  row: string;
  column: string;
  width_span: number; 
  height_span: number;
  items: any[];
  _top?: number;
  _left?: number;
};

const naturalSort = (a: string | null, b: string | null) => {
    return (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' });
};

export default function OnboardingSetupGrid() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  
  // Layout Constants
  const { width: screenWidth } = useWindowDimensions(); 
  
  // FIXED: 5 Columns strictly
  const VISIBLE_COLS = 5; 
  const GRID_PADDING = 12; 
  const GAP_SIZE = 6;
  const AVAILABLE_WIDTH = screenWidth - (GRID_PADDING * 2);
  const TOTAL_GAPS_W = GAP_SIZE * (VISIBLE_COLS - 1);
  const UNIT_WIDTH = (AVAILABLE_WIDTH - TOTAL_GAPS_W) / VISIBLE_COLS;
  const BASE_HEIGHT = 70;

  const [locations, setLocations] = useState<LocationSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageId, setStorageId] = useState<string | null>(null);

  // --- 1. ROBUST INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      if (!profile?.workgroup_id) return;
      
      try {
        // A. Check for Warehouse
        let { data: wh } = await supabase.from('warehouses')
            .select('id')
            .eq('workgroup_id', profile.workgroup_id)
            .limit(1)
            .single();

        if (!wh) {
            const { data: newWh, error: whError } = await supabase.from('warehouses')
                .insert({ name: 'Main Warehouse', workgroup_id: profile.workgroup_id })
                .select().single();
            if (whError) throw whError;
            wh = newWh;
        }

        // B. Check for Storage
        let { data: st } = await supabase.from('storages')
            .select('id')
            .eq('warehouse_id', wh.id)
            .limit(1)
            .single();

        if (!st) {
            const { data: newSt, error: stError } = await supabase.from('storages')
                .insert({ name: 'Section A', warehouse_id: wh.id, workgroup_id: profile.workgroup_id })
                .select().single();
            if (stError) throw stError;
            st = newSt;
        }

        setStorageId(st.id);
      } catch (e: any) {
        showError("Initialization Failed", e.message);
      }
    };
    init();
  }, [profile]);

  // --- 2. FETCH OR CREATE LOCATIONS ---
  const fetchData = useCallback(async () => {
    if (!storageId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('defined_locations')
        .select('*')
        .eq('storage_id', storageId);

      if (error) throw error;

      if (!data || data.length === 0) {
        await initializeDefaultGrid(storageId);
      } else {
        const formattedLocations = data.map(loc => ({
          ...loc,
          master_id: loc.master_id || loc.id, 
          width_span: loc.width_span || 1,
          height_span: loc.height_span || 1,
          items: [],
        }));
        setLocations(formattedLocations as LocationSlot[]);
        setLoading(false);
      }
    } catch (err: any) {
      showError(t('general.error'), err.message);
      setLoading(false);
    }
  }, [storageId]);

  const initializeDefaultGrid = async (sId: string) => {
    try {
      const newSlots = [];
      // FIXED: 5x5 Grid (Rows 1-5, Cols 1-5)
      const rows = ['1', '2', '3', '4', '5'];
      const cols = ['1', '2', '3', '4', '5'];
      
      for (const r of rows) {
        for (const c of cols) {
          newSlots.push({ storage_id: sId, shelf: 'A', row: r, column: c });
        }
      }
      
      const { error } = await supabase.from('defined_locations').insert(newSlots);
      if (error) throw error;
      
      const { data } = await supabase.from('defined_locations').select('*').eq('storage_id', sId);
      if (data) {
        setLocations(data.map(l => ({ ...l, master_id: l.id, width_span: 1, height_span: 1, items: [] })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- MERGE LOGIC ---
  const handleMerge = async (sourceSlot: LocationSlot, direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    const shelfSlots = locations.filter(l => l.shelf === sourceSlot.shelf);
    let neighbor: LocationSlot | undefined;
    
    const uniqueCols = [...new Set(shelfSlots.map(l => l.column))].sort(naturalSort);
    const uniqueRows = [...new Set(shelfSlots.map(l => l.row))].sort(naturalSort);
    const colIdx = uniqueCols.indexOf(sourceSlot.column);
    const rowIdx = uniqueRows.indexOf(sourceSlot.row);

    if (direction === 'RIGHT' && colIdx < uniqueCols.length - 1) neighbor = shelfSlots.find(l => l.row === sourceSlot.row && l.column === uniqueCols[colIdx + 1]);
    if (direction === 'DOWN' && rowIdx < uniqueRows.length - 1) neighbor = shelfSlots.find(l => l.column === sourceSlot.column && l.row === uniqueRows[rowIdx + 1]);

    if (!neighbor || neighbor.master_id === sourceSlot.master_id) return;

    const winningId = sourceSlot.master_id;
    const losingId = neighbor.master_id;

    setLocations(prev => prev.map(l => {
        if (l.master_id === losingId) return { ...l, master_id: winningId };
        return l;
    }));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
        const updates = locations.map(l => ({ id: l.id, master_id: l.master_id }));
        const { error } = await supabase.from('defined_locations').upsert(updates);
        if (error) throw error;
        router.push('/onboarding/add-first-item');
    } catch (e: any) {
        showError("Save Failed", e.message);
        setLoading(false);
    }
  };

  // --- VISUAL GRID CALCULATION ---
  const visualGrid = useMemo(() => {
    const shelvesDict: { [key: string]: LocationSlot[] } = {};
    locations.forEach(loc => {
      if (!shelvesDict[loc.shelf]) shelvesDict[loc.shelf] = [];
      shelvesDict[loc.shelf].push(loc);
    });

    return Object.keys(shelvesDict).sort(naturalSort).map(shelfKey => {
        const slots = shelvesDict[shelfKey];
        const uniqueRows = [...new Set(slots.map(l => l.row))].sort(naturalSort);
        const uniqueCols = [...new Set(slots.map(l => l.column))].sort(naturalSort);
        
        const mappedSlots = slots.map(slot => {
            const rowIdx = uniqueRows.indexOf(slot.row);
            const colIdx = uniqueCols.indexOf(slot.column);
            return { 
                ...slot, 
                _top: (rowIdx * (BASE_HEIGHT + GAP_SIZE)), 
                _left: (colIdx * (UNIT_WIDTH + GAP_SIZE)) 
            };
        });

        return {
            shelfLabel: shelfKey,
            totalHeight: Math.max((uniqueRows.length * BASE_HEIGHT) + ((uniqueRows.length - 1) * GAP_SIZE), BASE_HEIGHT),
            mappedSlots
        };
    });
  }, [locations, BASE_HEIGHT, GAP_SIZE, UNIT_WIDTH]);

  // --- COMPONENTS ---
  const MergeHandle = ({ direction, onPress }: { direction: any, onPress: () => void }) => {
    let style = {};
    if (direction === 'RIGHT') style = { right: -10, top: '50%', marginTop: -10 };
    if (direction === 'DOWN') style = { bottom: -10, left: '50%', marginLeft: -10 };
    return (
        <TouchableOpacity style={[styles.mergeHandle, style]} onPress={onPress}>
            <MaterialCommunityIcons name="link-variant-plus" size={16} color="white" />
        </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      <View style={styles.header}>
        <Text style={[typography.h1, styles.title, { color: colors.text }]}>
          {t('onboarding.setupGrid', 'Design Your Layout')}
        </Text>
        <Text style={[typography.body, styles.subtitle, { color: colors.subtext }]}>
          Tap the icons to merge slots into larger bins.
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 24 }}>
         {visualGrid.map((shelf) => (
            <View key={shelf.shelfLabel} style={{ marginBottom: 20 }}>
                <Text style={[typography.h3, { color: colors.text, marginBottom: 8 }]}>Shelf {shelf.shelfLabel}</Text>
                <View style={{ height: shelf.totalHeight, position: 'relative' }}>
                    {shelf.mappedSlots.map(slot => {
                         const isLeader = slot.id === locations.find(l => l.master_id === slot.master_id)?.id;
                         
                         // Determine connections
                         const getNeighbor = (rOff: number, cOff: number) => {
                             return locations.find(l => 
                                 l.shelf === slot.shelf && 
                                 l.row === (parseInt(slot.row) + rOff).toString() && 
                                 l.column === (parseInt(slot.column) + cOff).toString()
                             );
                         };
                         
                         const rightNeighbor = getNeighbor(0, 1);
                         const downNeighbor = getNeighbor(1, 0);

                         const isMergedRight = rightNeighbor?.master_id === slot.master_id;
                         const isMergedDown = downNeighbor?.master_id === slot.master_id;

                         return (
                            <View key={slot.id} style={{
                                position: 'absolute', top: slot._top, left: slot._left,
                                width: UNIT_WIDTH, height: BASE_HEIGHT, zIndex: isLeader ? 10 : 1
                            }}>
                                <View style={[styles.slot, { 
                                    backgroundColor: colors.card, 
                                    borderColor: colors.border,
                                    borderRightWidth: isMergedRight ? 0 : 1,
                                    borderBottomWidth: isMergedDown ? 0 : 1
                                }]}>
                                    {isLeader && (
                                        <Text style={{color: colors.text, fontWeight:'bold'}}>{slot.row}-{slot.column}</Text>
                                    )}
                                    
                                    {/* VISUAL GAP FILLERS */}
                                    {isMergedRight && (
                                        <View style={[styles.gapFillerRight, { backgroundColor: colors.card }]} />
                                    )}
                                    {isMergedDown && (
                                        <View style={[styles.gapFillerDown, { backgroundColor: colors.card }]} />
                                    )}

                                </View>
                                {isLeader && (
                                    <>
                                        <MergeHandle direction="RIGHT" onPress={() => handleMerge(slot, 'RIGHT')} />
                                        <MergeHandle direction="DOWN" onPress={() => handleMerge(slot, 'DOWN')} />
                                    </>
                                )}
                            </View>
                         );
                    })}
                </View>
            </View>
         ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleContinue}>
            <Text style={[typography.button, { color: colors.primaryText }]}>Save Layout & Continue</Text>
            <Feather name="arrow-right" size={20} color={colors.primaryText} style={{marginLeft: 8}} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20 },
  title: { textAlign: 'center', marginBottom: 8 },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  
  slot: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      borderRadius: 4, 
      borderWidth: 1,
      overflow: 'visible' // Important for fillers to show
  },
  
  // New Gap Filler Styles
  gapFillerRight: {
      position: 'absolute',
      right: -7, // Covers the GAP_SIZE (6) + borders
      top: 0,
      bottom: 0,
      width: 8,
      zIndex: 2
  },
  gapFillerDown: {
      position: 'absolute',
      bottom: -7,
      left: 0,
      right: 0,
      height: 8,
      zIndex: 2
  },

  mergeHandle: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', zIndex: 99 },
  footer: { position: 'absolute', bottom: 30, left: 24, right: 24 },
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12 }
});