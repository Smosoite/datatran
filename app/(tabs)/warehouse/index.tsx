import { useTranslation } from 'react-i18next';
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../../providers/ThemeProvider';
import { typography } from '../../../styles/typography';

// --- COPILOT IMPORTS ---
import { CopilotStep, walkthroughable, useCopilot } from "react-native-copilot";
import AsyncStorage from '@react-native-async-storage/async-storage';

const WalkablePressable = walkthroughable(Pressable);
const WalkableView = walkthroughable(View);

type Warehouse = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
};

export default function WarehouseScreen() {
  const { t } = useTranslation();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme(); 
  const router = useRouter();

  const [isLayoutReady, setIsLayoutReady] = useState(false);

  // --- COPILOT HOOK ---
  const { start: startTour } = useCopilot();

  // --- UPDATED TOUR LOGIC ---
  useEffect(() => {
    if (loading || !isLayoutReady) return;

    const checkFirstTime = async () => {
        try {
            const hasSeen = await AsyncStorage.getItem('HAS_SEEN_WAREHOUSE_TOUR');
            if (!hasSeen) {
                // Longer delay to ensure all components are mounted
                setTimeout(() => {
                  console.log('Starting warehouse tour');
                  startTour();
                }, 1000);
                await AsyncStorage.setItem('HAS_SEEN_WAREHOUSE_TOUR', 'true');
            }
        } catch (e) {
            console.warn("Tour check failed", e);
        }
    };
    checkFirstTime();
  }, [loading, isLayoutReady, startTour]);

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, icon, description');

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error: any) {
      console.error(t('general.warehouseFetch'), error.message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      fetchWarehouses();
    }, [fetchWarehouses])
  );

  if (loading) {
    return <ActivityIndicator style={[styles.centered, { backgroundColor: colors.background }]} size="large" color={colors.primary} />;
  }

  // --- HEADER FIX ---
  const renderHeaderRight = () => (
      <CopilotStep 
        text={t('pilot.newWarehouse')} 
        order={1} 
        name="addWarehouseHeader"
        active={true}
      >
        <WalkablePressable 
            collapsable={false}
            onPress={() => router.push('/create-warehouse')}
            style={{ padding: 10 }} // Add padding for better touch target
        >
          <FontAwesome name="plus" size={24} color={colors.selector} />
        </WalkablePressable>
      </CopilotStep>
  );

  const renderEmptyComponent = () => (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <Text style={[typography.caption, styles.emptyText, { color: colors.subtext }]}>{t('warehouse.noWarehouses')}</Text>
      
      {/* STEP 1 (Empty State Version) */}
      <CopilotStep 
        text={t('pilot.firstWarehouse')} 
        order={1} 
        name="createFirst"
        active={true}
      >
        <WalkableView>
          <Pressable 
              style={[styles.button, { backgroundColor: colors.primary }]} 
              onPress={() => router.push('/create-warehouse')}
          >
              <Text style={[typography.button, styles.buttonText, { color: colors.primaryText }]}>{t('warehouse.createFirst')}</Text>
          </Pressable>
        </WalkableView>
      </CopilotStep>
    </View>
  );

  if (warehouses.length === 0) {
    return (
        <View 
            style={{ flex: 1, backgroundColor: colors.background }}
            onLayout={() => {
              console.log('Empty state layout ready');
              setIsLayoutReady(true);
            }}
        >
          <Stack.Screen options={{ headerRight: undefined }} /> 
          {renderEmptyComponent()}
        </View>
    );
  }

  return (
    <View 
        style={{ flex: 1, backgroundColor: colors.background }}
        onLayout={() => {
          console.log('List layout ready');
          setIsLayoutReady(true);
        }}
    >
      <Stack.Screen
        options={{
          headerRight: renderHeaderRight,
        }}
      />

    <FlatList
      data={warehouses}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => {
          // Highlight the first warehouse as the example
          if (index === 0) {
              return (
                <CopilotStep 
                  text={t('pilot.openWarehouse')} 
                  order={2} 
                  name="viewWarehouse"
                  active={true}
                >
                    <WalkableView>
                      <Pressable
                          style={[styles.itemContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
                          onPress={() => router.push(`/warehouse/${item.id}`)}
                      >
                          <Feather name={item.icon || 'archive'} size={32} color={colors.text} style={styles.itemIcon} />
                          <View style={styles.itemTextContainer}>
                              <Text style={[typography.body, styles.itemName, { color: colors.text }]}>{item.name}</Text>
                              {item.description && <Text style={[typography.caption, styles.itemDescription, { color: colors.subtext }]}>{item.description}</Text>}
                          </View>
                      </Pressable>
                    </WalkableView>
                </CopilotStep>
              );
          }
          return (
            <Pressable
                style={[styles.itemContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/warehouse/${item.id}`)}
            >
                <Feather name={item.icon || 'archive'} size={32} color={colors.text} style={styles.itemIcon} />
                <View style={styles.itemTextContainer}>
                    <Text style={[typography.body, styles.itemName, { color: colors.text }]}>{item.name}</Text>
                    {item.description && <Text style={[typography.caption, styles.itemDescription, { color: colors.subtext }]}>{item.description}</Text>}
                </View>
            </Pressable>
          );
      }}
      contentContainerStyle={styles.list}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  list: { padding: 8 },
  emptyText: { marginBottom: 24 },
  button: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 8 },
  buttonText: { fontWeight: '600' },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  itemIcon: { marginRight: 16 },
  itemTextContainer: { flex: 1 },
  itemName: { fontWeight: 'bold' },
  itemDescription: { marginTop: 8 },
});