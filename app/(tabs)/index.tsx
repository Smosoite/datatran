import '../../i18n';
import i18n from '../../i18n';
import { I18nextProvider } from 'react-i18next';
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

  const { colors } = useTheme();
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
    }, [t])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}></Text>
        <View style={styles.buttonContainer}>
          <Pressable style={[styles.actionButton, { backgroundColor: colors.selector }]} onPress={() => router.push('/add-item')}>
            <FontAwesome name="plus-circle" size={20} color={colors.text} style={[typography.shadow, { textShadowColor: colors.textShadow }]} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              style={[typography.button, styles.buttonText, { color: colors.subtext }]}
            >
              {t('dashboard.addItem')}
            </Text>
          </Pressable>

          <Pressable style={[styles.actionButton, { backgroundColor: colors.selector }]} onPress={() => router.push('/find')}>
            <FontAwesome name="search" size={20} color={colors.subtext}/>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              style={[typography.button, styles.buttonText, { color: colors.text }]}
            >
              {t('dashboard.findItem')}
            </Text>
          </Pressable>

          <Pressable style={[styles.actionButton, { backgroundColor: colors.selector }]} onPress={() => router.push('/scan')}>
            <FontAwesome name="barcode" size={20} color={colors.subtext}/>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              style={[typography.button, styles.buttonText, { color: colors.subtext, textShadowColor: colors.textShadow }]}
            >
              {t('dashboard.scanItem')}
            </Text>
          </Pressable>
        </View>
      </View>

      {!loading && restockItems.length > 0 && (
        <Text style={[typography.h3, styles.listHeader, { color: colors.text }]}>
          {t('dashboard.needsRestock')}
        </Text>
      )}

      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ paddingTop: 20 }}/>
        ) : (
          <FlatList
            data={restockItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.itemContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.itemInfo}>
                  <Text style={[typography.body, styles.itemName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
                  <Text style={[typography.body, styles.itemLocation, { color: colors.subtext }]} numberOfLines={1}>{item.warehouse_name} / {item.storage_name}</Text>
                </View>
                <Text
                  style={[typography.body, styles.itemQuantity, { color: colors.danger }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  buttonText: {
    marginLeft: 6,
    flexShrink: 1,
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
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
  },
  itemLocation: {
    marginTop: 8,
  },
  itemQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    flexShrink: 0,
    minWidth: 80,
    textAlign: 'right',
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
