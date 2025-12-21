import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator, Pressable, Alert, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../providers/ThemeProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';

// --- COPILOT IMPORTS ---
import { CopilotStep, walkthroughable, useCopilot } from "react-native-copilot";
import AsyncStorage from '@react-native-async-storage/async-storage';

const WalkableTextInput = walkthroughable(TextInput);
const WalkablePressable = walkthroughable(Pressable);
const WalkableView = walkthroughable(View);

type SearchResult = {
  id: string;
  name: string;
  quantity: number;
  warehouses: { name: string } | null;
  storages: { name: string } | null;
  defined_locations: {
    shelf: string;
    row: string | null;
    column: string | null;
  } | null;
};

export default function FindScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { colors } = useTheme(); 

  // --- COPILOT HOOK ---
  const { start: startTour } = useCopilot();

  // --- START TOUR ON MOUNT (ONCE) ---
  useEffect(() => {
    const checkFirstTime = async () => {
        try {
            const hasSeen = await AsyncStorage.getItem('HAS_SEEN_FIND_TOUR');
            if (!hasSeen) {
                setTimeout(() => startTour(), 500);
                await AsyncStorage.setItem('HAS_SEEN_FIND_TOUR', 'true');
            }
        } catch (e) {
            console.warn("Tour check failed", e);
        }
    };
    checkFirstTime();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase
        .from('items')
        .select(`id, name, quantity, warehouses ( name ), storages ( name ), defined_locations ( shelf, row, column )`)
        .ilike('name', `%${searchQuery.trim()}%`);

      if (error) throw error;
      setResults(data || []);
    } catch (error: any) {
      showError(t('general.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateItemQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    const { error } = await supabase
      .from('items')
      .update({ quantity: newQuantity })
      .eq('id', itemId);

    if (error) {
      showError(t('general.error'), t('general.errorQuantity'));
    } else {
      setResults(currentResults =>
        currentResults.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const formatLocation = (item: SearchResult) => {
    if (!item.defined_locations) return 'N/A';
    return [
      item.defined_locations.shelf,
      item.defined_locations.row,
      item.defined_locations.column
    ].filter(Boolean).join(' - ');
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.searchContainer}>
        {/* STEP 1: Search Bar */}
        <CopilotStep text={t('pilot.find')} order={1} name="searchBar">
            <WalkableTextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder={t('general.searchByName')}
            placeholderTextColor={colors.subtext}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            />
        </CopilotStep>
        <Pressable style={[styles.searchButton, { backgroundColor: colors.primary }]} onPress={handleSearch}>
          <FontAwesome name="search" size={20} color={colors.text} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          scrollEnabled={false} 
          renderItem={({ item, index }) => {
              // Highlight the first result for the tour
              if (index === 0) {
                  return (
                    <View style={[styles.itemContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <CopilotStep text={t('pilot.findlocation')} order={2} name="itemDetails">
                          <WalkableView style={styles.detailsColumn}>
                            <Text style={[typography.body, styles.itemName, { color: colors.text }]}>{item.name}</Text>
                            <Text style={[typography.body, styles.itemLocation, { color: colors.subtext }]}>
                              {t('find.warehouse')}: {item.warehouses?.name || 'N/A'}
                            </Text>
                            <Text style={[typography.body, styles.itemLocation, { color: colors.subtext }]}>
                              {t('find.storage')}: {item.storages?.name || 'N/A'}
                            </Text>
                            <Text style={[typography.body, styles.itemLocation, { color: colors.subtext }]}>
                              {t('find.location')}: {formatLocation(item)}
                            </Text>
                          </WalkableView>
                      </CopilotStep>

                      <View style={styles.actionsColumn}>
                        {/* STEP 3: Edit Button */}
                        <CopilotStep text={t('pilot.edit')} order={3} name="editItem">
                            <WalkablePressable style={styles.editButton} onPress={() => router.push(`/edit-item/${item.id}`)}>
                                <FontAwesome name="pencil" size={18} color={colors.primary} />
                                <Text style={[typography.button, styles.editButtonText, { color: colors.primary }]}>{t('find.edit')}</Text>
                            </WalkablePressable>
                        </CopilotStep>
                        
                        {/* STEP 4: Quantity Controls */}
                        <CopilotStep text="Quickly adjust stock levels." order={4} name="quantityControls">
                            <WalkableView style={[styles.quantityControls, { backgroundColor: colors.background }]}>
                                <Text style={[typography.body, styles.quantityLabel, { color: colors.text }]}>{t('item.quantity')}</Text>
                                <Pressable style={styles.quantityButton} onPress={() => updateItemQuantity(item.id, item.quantity - 1)}>
                                    <FontAwesome name="minus" size={16} color={colors.primary} />
                                </Pressable>
                                <Text style={[typography.body, styles.quantityValue, { color: colors.text }]}>{item.quantity}</Text>
                                <Pressable style={styles.quantityButton} onPress={() => updateItemQuantity(item.id, item.quantity + 1)}>
                                    <FontAwesome name="plus" size={16} color={colors.primary} />
                                </Pressable>
                            </WalkableView>
                        </CopilotStep>
                      </View>
                    </View>
                  );
              }
              // Normal render for other items
              return (
                <View style={[styles.itemContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.detailsColumn}>
                    <Text style={[typography.body, styles.itemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[typography.body, styles.itemLocation, { color: colors.subtext }]}>
                      {t('find.warehouse')}: {item.warehouses?.name || 'N/A'}
                    </Text>
                    <Text style={[typography.body, styles.itemLocation, { color: colors.subtext }]}>
                      {t('find.storage')}: {item.storages?.name || 'N/A'}
                    </Text>
                    <Text style={[typography.body, styles.itemLocation, { color: colors.subtext }]}>
                      {t('find.location')}: {formatLocation(item)}
                    </Text>
                  </View>

                  <View style={styles.actionsColumn}>
                    <Pressable style={styles.editButton} onPress={() => router.push(`/edit-item/${item.id}`)}>
                       <FontAwesome name="pencil" size={18} color={colors.primary} />
                       <Text style={[typography.button, styles.editButtonText, { color: colors.primary }]}>{t('find.edit')}</Text>
                    </Pressable>
                    
                    <View style={[styles.quantityControls, { backgroundColor: colors.background }]}>
                      <Text style={[typography.body, styles.quantityLabel, { color: colors.text }]}>{t('item.quantity')}</Text>
                      <Pressable style={styles.quantityButton} onPress={() => updateItemQuantity(item.id, item.quantity - 1)}>
                        <FontAwesome name="minus" size={16} color={colors.primary} />
                      </Pressable>
                      <Text style={[typography.body, styles.quantityValue, { color: colors.text }]}>{item.quantity}</Text>
                      <Pressable style={styles.quantityButton} onPress={() => updateItemQuantity(item.id, item.quantity + 1)}>
                        <FontAwesome name="plus" size={16} color={colors.primary} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
          }}
          ListEmptyComponent={() => (
              searched && <Text style={[typography.caption, styles.emptyText, { color: colors.subtext }]}>{t('item.noResults')}</Text>
          )}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 8 },
  searchContainer: { flexDirection: 'row', marginBottom: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 16 },
  searchButton: { marginLeft: 8, padding: 16, borderRadius: 8, justifyContent: 'center' },
  itemContainer: { padding: 16, borderRadius: 8, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1 },
  detailsColumn: { flex: 1, marginRight: 8 },
  actionsColumn: { alignItems: 'flex-end', justifyContent: 'space-between' },
  itemName: { fontWeight: 'bold', marginBottom: 8 },
  itemLocation: { marginTop: 8 },
  editButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  editButtonText: { marginLeft: 8, fontWeight: '600' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingVertical: 8, paddingHorizontal: 8, marginTop: 8 },
  quantityLabel: { fontWeight: '600', marginRight: 8, marginLeft: 8 },
  quantityButton: { padding: 8 },
  quantityValue: { fontWeight: 'bold', minWidth: 30, textAlign: 'center' },
  emptyText: { textAlign: 'center', marginTop: 48 },
});