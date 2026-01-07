import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { typography } from '../../styles/typography';

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
  // --- FIX: Removed unused `hasLocations` state ----

  const { colors } = useTheme(); // --- FIX: Correct way to get colors ---
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
        const { data: restockData, error: restockError } = await supabase.rpc('get_restock_items');
        
        if (restockError) {
          console.error(t('general.errorFetch'), restockError.message);
        } else {
          setRestockItems(restockData || []);
        }

        setLoading(false);
      };

      fetchData();
    }, [t]) // Added `t` to dependency array for correctness
  );

  // --- FIX: Removed unused `updateItemQuantity` function ---

  return (
    // --- FIX: `styles.container` is now just `flex: 1` ---
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}></Text>
        <View style={styles.buttonContainer}>
  {/* Button 1: Add */}
  <Pressable style={[styles.actionButton, { backgroundColor: colors.selector }]} onPress={() => router.push('/add-item')}>
    <FontAwesome name="plus-circle" size={20} color={colors.text} style={[typography.shadow, { textShadowColor: colors.textShadow }]} />
    <Text 
      numberOfLines={1} 
      adjustsFontSizeToFit 
      minimumFontScale={0.5} // Won't shrink below 50% of original size
      style={[typography.button, typography.shadow, styles.buttonText, { color: colors.text, textShadowColor: colors.textShadow }]}
    >
      {t('dashboard.addItem')}
    </Text>
  </Pressable>

  {/* Button 2: Find */}
  <Pressable style={[styles.actionButton, { backgroundColor: colors.selector }]} onPress={() => router.push('/find')}>
    <FontAwesome name="search" size={20} color={colors.text} style={[typography.shadow, { textShadowColor: colors.textShadow }]} />
    <Text 
      numberOfLines={1} 
      adjustsFontSizeToFit 
      minimumFontScale={0.5} 
      style={[typography.button, typography.shadow, styles.buttonText, { color: colors.text, textShadowColor: colors.textShadow }]}
    >
      {t('dashboard.findItem')}
    </Text>
  </Pressable>

  {/* Button 3: Scan */}
  <Pressable style={[styles.actionButton, { backgroundColor: colors.selector }]} onPress={() => router.push('/scan')}>
    <FontAwesome name="barcode" size={20} color={colors.text} style={[typography.shadow, { textShadowColor: colors.textShadow }]}/>
    <Text 
      numberOfLines={1} 
      adjustsFontSizeToFit 
      minimumFontScale={0.5} 
      style={[typography.button, typography.shadow, styles.buttonText, { color: colors.text, textShadowColor: colors.textShadow }]}
    >
      {t('dashboard.scanItem')}
    </Text>
  </Pressable>
</View>
      </View>
      
      <Text style={[typography.h3, styles.listHeader, { color: colors.text }]}>{t('dashboard.needsRestock')}</Text>
      
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
            <FontAwesome name="cubes" size={20} color={colors.text} style={[
    typography.shadow, { textShadowColor: colors.textShadow }]} />
            <Text style={[typography.h3, typography.shadow, styles.restockButtonText, { color: colors.text, textShadowColor: colors.textShadow }]}>{t('restock.button')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    padding: 16,
    paddingTop: 40, 
    borderBottomWidth: 1,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  // --- UPDATED SECTION START ---
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',       // Allows buttons to drop to next line if text is long
    justifyContent: 'center', // Keeps them centered on screen
    gap: 12,                // Uniform spacing between buttons (horizontal & vertical)
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Ensures content inside button is centered
    paddingVertical: 10,      // Slightly increased touch target
    paddingHorizontal: 16,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    // Optional: ensures a single very long button doesn't break the screen
    maxWidth: '100%', 
  },
  // --- UPDATED SECTION END ---
  buttonText: {
    marginLeft: 8,
    flexShrink: 1, // Allows text to shrink if absolutely necessary
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
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
  itemName: {
  },
  itemLocation: {
    marginTop: 8,
  },
  itemQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
  },
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