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
    router.push('/onboarding/setup-grid';
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
                <Feather name={warehouse.icon as any} size={32} color={colors.text} />
                <View style={styles.warehouseInfo}>
                  <Text style={[typography.h3, styles.warehouseName, { color: colors.text }]}>
                    {warehouse.name}
                  </Text>
                  <Text style={[typography.caption, styles.warehouseDesc, { color: colors.subtext }]}>
                    {warehouse.description}
                  </Text>
                </View>
                {selectedWarehouse === warehouse.id && (
                  <FontAwesome name="check-circle" size={24} color={colors.primary} />
                )}
              </View>

              {/* Storage Units */}
              {selectedWarehouse === warehouse.id && showStorages && (
                <Animated.View style={styles.storagesContainer}>
                  <Text style={[typography.body, styles.storagesTitle, { color: colors.text }]}>
                    {t('onboarding.storageUnits', 'Storage Units:')}
                  </Text>
                  {warehouse.storages.map((storage, index) => (
                    <View key={index} style={[styles.storageItem, { backgroundColor: colors.background }]}>
                      <FontAwesome name="inbox" size={16} color={colors.primary} />
                      <Text style={[typography.caption, styles.storageName, { color: colors.text }]}>
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
            <FontAwesome name="lightbulb-o" size={20} color={colors.primary} />
            <View style={styles.tipContent}>
              <Text style={[typography.body, styles.tipTitle, { color: colors.primary }]}>
                {t('onboarding.proTip', 'Pro Tip')}
              </Text>
              <Text style={[typography.caption, styles.tipText, { color: colors.text }]}>
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
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20 },
  title: { textAlign: 'center', marginBottom: 8, fontWeight: 'bold' },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  content: { flex: 1, paddingHorizontal: 24 },
  warehousesContainer: { gap: 16, marginBottom: 20 },
  warehouseCard: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  warehouseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  warehouseInfo: { flex: 1 },
  warehouseName: { fontWeight: 'bold', marginBottom: 4 },
  warehouseDesc: {},
  storagesContainer: {
    marginTop: 16,
    paddingTop: 16,
    gap: 8,
  },
  storagesTitle: { fontWeight: '600', marginBottom: 8 },
  storageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  storageName: { fontWeight: '500' },
  tipsContainer: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginTop: 20,
  },
  tipContent: { flex: 1 },
  tipTitle: { fontWeight: 'bold', marginBottom: 4 },
  tipText: { lineHeight: 18 },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
  },
});