import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { typography } from '../../styles/typography';
import { FontAwesome, Feather } from '@expo/vector-icons';

const demoWarehouses = [
  {
    id: '1',
    name: 'Main Warehouse',
    icon: 'warehouse',
    description: 'Primary storage facility',
    storages: ['Aisle A', 'Aisle B', 'Cold Storage']
  },
  {
    id: '2', 
    name: 'Retail Store',
    icon: 'shopping-bag',
    description: 'Front-of-house inventory',
    storages: ['Display Area', 'Back Room', 'Register']
  },
];

export default function DemoWarehouseScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [showStorages, setShowStorages] = useState(false);
  
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(30);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleWarehouseSelect = (warehouseId: string) => {
    setSelectedWarehouse(warehouseId);
    setTimeout(() => {
      setShowStorages(true);
    }, 300);
  };

  const handleContinue = () => {
    router.push('/onboarding/setup-grid');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[typography.h1, styles.title, { color: colors.text }]}>
          {t('onboarding.warehouseDemo', 'Warehouse Organization')}
        </Text>
        <Text style={[typography.body, styles.subtitle, { color: colors.subtext }]}>
          {t('onboarding.warehouseDemoDesc', 'Organize your inventory across multiple locations')}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Demo Warehouses */}
        <Animated.View 
          style={[
            styles.warehousesContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {demoWarehouses.map((warehouse) => (
            <Pressable
              key={warehouse.id}
              style={[
                styles.warehouseCard,
                { 
                  backgroundColor: colors.card, 
                  borderColor: selectedWarehouse === warehouse.id ? colors.primary : colors.border,
                  borderWidth: selectedWarehouse === warehouse.id ? 2 : 1,
                }
              ]}
              onPress={() => handleWarehouseSelect(warehouse.id)}
            >
              <View style={styles.warehouseHeader}>
                <Feather name={warehouse.icon as any} size={28} color={colors.text} />
                <View style={styles.warehouseInfo}>
                  <Text style={[styles.warehouseName, { color: colors.text }]}>
                    {warehouse.name}
                  </Text>
                  <Text style={[styles.warehouseDesc, { color: colors.subtext }]}>
                    {warehouse.description}
                  </Text>
                </View>
                {selectedWarehouse === warehouse.id && (
                  <FontAwesome name="check-circle" size={20} color={colors.primary} />
                )}
              </View>

              {/* Storage Units */}
              {selectedWarehouse === warehouse.id && showStorages && (
                <Animated.View style={styles.storagesContainer}>
                  <Text style={[styles.storagesTitle, { color: colors.text }]}>
                    {t('onboarding.storageUnits', 'Storage Units:')}
                  </Text>
                  {warehouse.storages.map((storage, index) => (
                    <View key={index} style={[styles.storageItem, { backgroundColor: colors.background }]}>
                      <FontAwesome name="inbox" size={14} color={colors.primary} />
                      <Text style={[styles.storageName, { color: colors.text }]}>
                        {storage}
                      </Text>
                    </View>
                  ))}
                </Animated.View>
              )}
            </Pressable>
          ))}
        </Animated.View>

        {/* Interactive Tips */}
        {selectedWarehouse && (
          <Animated.View
            style={[
              styles.tipsContainer,
              { backgroundColor: colors.primaryMuted, borderColor: colors.primary }
            ]}
          >
            <FontAwesome name="lightbulb-o" size={18} color={colors.primary} />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.primary }]}>
                {t('onboarding.proTip', 'Pro Tip')}
              </Text>
              <Text style={[styles.tipText, { color: colors.text }]}>
                {t('onboarding.warehouseTip', 'You can create unlimited warehouses and customize storage units for any type of inventory organization.')}
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <Pressable
          style={[styles.navButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={16} color={colors.text} />
          <Text style={[typography.button, { color: colors.text, marginLeft: 8 }]}>
            {t('general.back', 'Back')}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.navButton, 
            { 
              backgroundColor: selectedWarehouse ? colors.primary : colors.border,
              opacity: selectedWarehouse ? 1 : 0.5,
            }
          ]}
          onPress={handleContinue}
          disabled={!selectedWarehouse}
        >
          <Text style={[typography.button, { color: colors.primaryText, marginRight: 8 }]}>
            {t('onboarding.exploreInventory', 'Explore Inventory')}
          </Text>
          <FontAwesome name="arrow-right" size={16} color={colors.primaryText} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingHorizontal: 24, paddingBottom: 8 },
  title: { textAlign: 'center', marginBottom: 4, fontWeight: 'bold', fontSize: 22 },
  subtitle: { textAlign: 'center', lineHeight: 20, fontSize: 14 },
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 100 },
  warehousesContainer: { gap: 12, marginBottom: 12, marginTop: 12 },
  warehouseCard: {
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
  },
  warehouseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  warehouseInfo: { flex: 1 },
  warehouseName: { fontWeight: 'bold', marginBottom: 2, fontSize: 16 },
  warehouseDesc: { fontSize: 13 },
  storagesContainer: {
    marginTop: 12,
    paddingTop: 12,
    gap: 6,
  },
  storagesTitle: { fontWeight: '600', marginBottom: 6, fontSize: 14 },
  storageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    gap: 10,
  },
  storageName: { fontWeight: '500', fontSize: 13 },
  tipsContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginTop: 12,
  },
  tipContent: { flex: 1 },
  tipTitle: { fontWeight: 'bold', marginBottom: 2, fontSize: 14 },
  tipText: { lineHeight: 16, fontSize: 13 },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
  },
});