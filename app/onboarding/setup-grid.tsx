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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions(); 
  const isLandscape = screenWidth > screenHeight;
  const VISIBLE_COLS = isLandscape ? 7 : 5; 
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

        // If no warehouse, create one!
        if (!wh) {
            const { data: newWh, error: whError } = await supabase.from('warehouses')
                .insert({ 
                    name: 'Main Warehouse', 
                    workgroup_id: profile.workgroup_id 
                })
                .select()
                .single();
            
            if (whError) throw whError;
            wh = newWh;
        }

        // B. Check for Storage
        let { data: st } = await supabase.from('storages')
            .select('id')
            .eq('warehouse_id', wh.id)
            .limit(1)
            .single();

        // If no storage, create one!
        if (!st) {
            const { data: newSt, error: stError } = await supabase.from('storages')
                .insert({ 
                    name: 'Section A', 
                    warehouse_id: wh.id,
                    workgroup_id: profile.workgroup_id 
                })
                .select()
                .single();

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
        // AUTO-INITIALIZE: Create default grid
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
      const rows = ['1', '2', '3', '4', '5'];
      const cols = ['1', '2', '3', '4', '5'];
      
      for (const r of rows) {
        for (const c of cols) {
          // FIX: Removed 'workgroup_id' here
          newSlots.push({
            storage_id: sId,
            shelf: 'A',
            row: r,
            column: c
          });
        }
      }
      
      const { error } = await supabase.from('defined_locations').insert(newSlots);
      if (error) throw error;
      
      // Re-fetch immediately
      const { data } = await supabase.from('defined_locations').select('*').eq('storage_id', sId);
      if (