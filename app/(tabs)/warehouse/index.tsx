import { useTranslation } from 'react-i18next';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, TextInput, ScrollView } from 'react-native';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Bell, Plus, Search, SlidersHorizontal, Package } from 'lucide-react-native';
import { useTheme } from '../../../providers/ThemeProvider';
import { typography } from '../../../styles/typography';

type Item = {
  id: string;
  name: string;
  quantity: number;
  restock_threshold: number;
  storages: {
    name: string;
    warehouses: {
      name: string;
    } | null;
  } | null;
};

export default function InventoryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Electronics', 'Supplies', 'Furniture'];

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('items')
        .select(`
          id,
          name,
          quantity,
          restock_threshold,
          storages (
            name,
            warehouses (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedItems = (data || []).map(item => ({
        ...item,
        storages: item.storages || null
      }));

      setItems(formattedItems);
      setFilteredItems(formattedItems);
    } catch (error: any) {
      console.error('Error fetching items:', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems])
  );

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (text === '') {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item =>
        item.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  }, [items]);

  const getStockStatus = (item: Item) => {
    if (item.quantity <= item.restock_threshold) {
      return { label: 'LOW STOCK', color: colors.danger, bgColor: 'rgba(239, 68, 68, 0.1)' };
    }
    return { label: 'IN STOCK', color: colors.success, bgColor: 'rgba(16, 185, 129, 0.1)' };
  };

  const renderItem = ({ item }: { item: Item }) => {
    const status = getStockStatus(item);
    const location = item.storages
      ? `${item.storages.warehouses?.name || 'Unknown'}, ${item.storages.name}`
      : 'No location';

    return (
      <Pressable
        style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(`/edit-item/${item.id}`)}
      >
        <View style={[styles.itemImage, { backgroundColor: colors.primaryMuted }]}>
          <Package size={24} color={colors.primary} />
        </View>
        <View style={styles.itemContent}>
          <Text style={[typography.h4, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[typography.caption, { color: colors.subtext, marginTop: 4 }]} numberOfLines={1}>
            {location}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bgColor, marginTop: 6 }]}>
            <Text style={[typography.captionSmall, { color: status.color, fontWeight: '600' }]}>
              {status.label}
            </Text>
          </View>
        </View>
        <Text style={[typography.number, { color: colors.text }]}>
          {item.quantity}
        </Text>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[typography.h2, { color: colors.text }]}>Inventory</Text>
          <View style={styles.headerIcons}>
            <Pressable style={styles.iconButton}>
              <Bell size={24} color={colors.text} />
            </Pressable>
            <Pressable style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/add-item')}>
              <Plus size={24} color={colors.primaryText} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={20} color={colors.subtext} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search items, SKUs, or locations"
            placeholderTextColor={colors.subtext}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <Pressable>
            <SlidersHorizontal size={20} color={colors.subtext} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map((category) => (
            <Pressable
              key={category}
              style={[
                styles.categoryPill,
                { backgroundColor: selectedCategory === category ? colors.primary : colors.card, borderColor: colors.border },
                selectedCategory === category && { borderColor: colors.primary }
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  typography.body,
                  { color: selectedCategory === category ? colors.primaryText : colors.text }
                ]}
              >
                {category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.listHeader}>
        <Text style={[typography.captionSmall, { color: colors.subtext }]}>RECENT ITEMS</Text>
        <Pressable onPress={() => router.push('/find')}>
          <Text style={[typography.caption, { color: colors.primary }]}>View All</Text>
        </Pressable>
      </View>

      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[typography.body, { color: colors.subtext }]}>No items found</Text>
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.primary, marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }]}
            onPress={() => router.push('/add-item')}
          >
            <Text style={[typography.button, { color: colors.primaryText }]}>Add First Item</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  categoriesScroll: {
    marginBottom: 8,
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});
