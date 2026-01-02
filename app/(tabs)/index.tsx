import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { typography } from '../../styles/typography';
import { fetchWithCache } from '../../lib/offline'; 
import { showError } from '../../lib/toast';

// --- COPILOT IMPORTS ---
import { CopilotStep, walkthroughable, useCopilot } from "react-native-copilot";
import AsyncStorage from '@react-native-async-storage/async-storage';

const WalkablePressable = walkthroughable(Pressable);
const WalkableView = walkthroughable(View);

type RestockItem = {
  id: string;
  name: string;
  quantity: number;
  restock_threshold: number;
  warehouse_name: string;
  storage_name: string;
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const [isLayoutReady, setIsLayoutReady] = useState(false);

  // --- COPILOT HOOK ---
  const { start: startTour } = useCopilot();

  // --- UPDATED TOUR LOGIC ---
  useEffect(() => {
    if (loading || !isLayoutReady) return;

    const checkFirstTime = async () => {
        try {
            const hasSeen = await AsyncStorage.getItem('HAS_SEEN_DASHBOARD_TOUR');
            if (!hasSeen) {
                // Longer delay for more complex layouts
                setTimeout(() => {
                  console.log('Starting dashboard tour');
                  startTour();
                }, 1000);
                await AsyncStorage.setItem('HAS_SEEN_DASHBOARD_TOUR', 'true');
            }
        } catch (e) {
            console.warn("Tour check failed", e);
        }
    };
    checkFirstTime();
  }, [loading, isLayoutReady, startTour]);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
        const { data, error, isOfflineData } = await fetchWithCache('restock_items', async () => {
            return await supabase.rpc('get_restock_items');
        });

        setIsOfflineMode(isOfflineData);

        if (error) {
          if (!data) console.error(t('general.errorFetch'), error.message);
        } else {
          setRestockItems(data || []);
        }
        setLoading(false);
      };

      fetchData();
    }, [t])
  );

  return (
    <View 
      style={[styles.container, { backgroundColor: colors.background }]}
      onLayout={() => {
        console.log('Dashboard layout ready');
        setIsLayoutReady(true);
      }}
    >
      <View style={[styles.headerContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}></Text>
        <View style={styles.buttonContainer}>
          
          {/* STEP 1: Add Item */}
          <CopilotStep 
            text={t('pilot.addNew')} 
            order={1} 
            name="addItem"
            active={true}
          >
            <WalkableView>
              <Pressable 
                style={[styles.actionButton, { backgroundColor: colors.selector }]} 
                onPress={() => router.push('/add-item')}
              >
                  <FontAwesome name="plus-circle" size={20} color={colors.text} style={[typography.shadow, { textShadowColor: colors.textShadow }]} />
                  <Text style={[typography.button, typography.shadow, styles.buttonText, { color: colors.text, textShadowColor: colors.textShadow }]}>{t('dashboard.addItem')}</Text>
              </Pressable>
            </WalkableView>
          </CopilotStep>

          {/* STEP 2: Find Item */}
          <CopilotStep 
            text={t('pilot.search')} 
            order={2} 
            name="findItem"
            active={true}
          >
            <WalkableView>
              <Pressable 
                style={[styles.actionButton, { backgroundColor: colors.selector }]} 
                onPress={() => router.push('/find')}
              >
                  <FontAwesome name="search" size={20} color={colors.text} style={[typography.shadow, { textShadowColor: colors.textShadow }]} />
                  <Text style={[typography.button, typography.shadow, styles.buttonText, { color: colors.text, textShadowColor: colors.textShadow }]}>{t('dashboard.findItem')}</Text>
              </Pressable>
            </WalkableView>
          </CopilotStep>

          {/* STEP 3: Scan Item */}
          <CopilotStep 
            text={t('pilot.scan')} 
            order={3} 
            name="scanItem"
            active={true}
          >
            <WalkableView>
              <Pressable 
                style={[styles.actionButton, { backgroundColor: colors.selector }]} 
                onPress={() => router.push('/scan')}
              >
                  <FontAwesome name="barcode" size={20} color={colors.text} style={[typography.shadow, { textShadowColor: colors.textShadow }]}/>
                  <Text style={[typography.button, typography.shadow, styles.buttonText, { color: colors.text, textShadowColor: colors.textShadow }]}>{t('dashboard.scanItem')}</Text>
              </Pressable>
            </WalkableView>
          </CopilotStep>

        </View>
      </View>

      {isOfflineMode && (
        <View style={{ backgroundColor: '#EAB308', padding: 4, alignItems: 'center' }}>
            <Text style={[typography.caption, { color: 'black' }]}>OFFLINE MODE - Viewing cached data</Text>
        </View>
      )}

      {/* STEP 4: Restock List */}
      <CopilotStep 
        text={t('pilot.restock')} 
        order={4} 
        name="restockList"
        active={true}
      >
        <WalkableView>
            <Text style={[typography.h3, styles.listHeader, { color: colors.text }]}>{t('dashboard.needsRestock')}</Text>
        </WalkableView>
      </CopilotStep>
      
      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ paddingTop: 20 }}/>
        ) : (
          <FlatList
            data={restockItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.itemContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View>
                  <Text style={[typography.body, styles.itemName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[typography.body, styles.itemLocation, { color: colors.subtext }]}>{item.warehouse_name} / {item.storage_name}</Text>
                </View>
                <Text style={[typography.body, styles.itemQuantity, { color: colors.danger }]}>
                  {item.quantity} / {item.restock_threshold}
                </Text>
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={[typography.button, styles.emptyText, { color: colors.subtext }]}>{t('dashboard.wellStocked')}</Text>
              </View>
            )}
          />
        )}
        
        {!loading && restockItems.length > 0 && (
          <Pressable style={[styles.restockButton, { backgroundColor: colors.selector }]} onPress={() => router.push('/restock')}>
            <FontAwesome name="cubes" size={20} color={colors.text} style={[typography.shadow, { textShadowColor: colors.textShadow }]} />
            <Text style={[typography.h3, typography.shadow, styles.restockButtonText, { color: colors.text, textShadowColor: colors.textShadow }]}>{t('restock.button')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { padding: 16, paddingTop: 40, borderBottomWidth: 1 },
  title: { textAlign: 'center', marginBottom: 16 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  buttonText: { marginLeft: 8 },
  listHeader: { paddingHorizontal: 16, paddingTop: 16 },
  listContainer: { flex: 1 },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemName: { },
  itemLocation: { marginTop: 8 },
  itemQuantity: { fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { },
  restockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    margin: 16,
    borderRadius: 16,
    elevation: 3,
  },
  restockButtonText: { marginLeft: 16 },
});