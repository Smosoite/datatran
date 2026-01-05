import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { typography } from '../../styles/typography';
import { FontAwesome } from '@expo/vector-icons';

const demoItems = [
  {
    id: '1',
    name: 'Copper Wire Spool',
    quantity: 45,
    threshold: 10,
    location: 'A1-R2-C3',
    warehouse: 'Main Warehouse',
    needsRestock: false,
  },
  {
    id: '2',
    name: 'LED Light Bulbs',
    quantity: 8,
    threshold: 15,
    location: 'A2-R1-C1',
    warehouse: 'Main Warehouse',
    needsRestock: true,
  },
  {
    id: '3',
    name: 'Safety Helmets',
    quantity: 23,
    threshold: 5,
    location: 'B1-R3-C2',
    warehouse: 'Main Warehouse',
    needsRestock: false,
  },
  {
    id: '4',
    name: 'Power Drill Bits',
    quantity: 3,
    threshold: 12,
    location: 'A1-R1-C4',
    warehouse: 'Main Warehouse',
    needsRestock: true,
  },
];

export default function DemoInventoryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  
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

  const handleItemSelect = (itemId: string) => {
    setSelectedItem(itemId);
    setTimeout(() => {
      setShowActions(true);
    }, 200);
  };

  const handleQuantityUpdate = (itemId: string, change: number) => {
    // Demo animation - in real app this would update the database
    console.log(`Updating item ${itemId} by ${change}`);
  };

  const renderItem = ({ item }: { item: typeof demoItems[0] }) => (
    <Pressable
      style={[
        styles.itemCard,
        { 
          backgroundColor: colors.card, 
          borderColor: selectedItem === item.id ? colors.primary : colors.border,
          borderWidth: selectedItem === item.id ? 2 : 1,
        }
      ]}
      onPress={() => handleItemSelect(item.id)}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={[typography.body, styles.itemName, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text style={[typography.caption, styles.itemLocation, { color: colors.subtext }]}>
            📍 {item.location} • {item.warehouse}
          </Text>
        </View>
        
        <View style={styles.quantityContainer}>
          <Text style={[
            typography.h3, 
            styles.quantity, 
            { color: item.needsRestock ? colors.danger : colors.text }
          ]}>
            {item.quantity}
          </Text>
          {item.needsRestock && (
            <View style={[styles.restockBadge, { backgroundColor: colors.danger }]}>
              <Text style={[typography.caption, styles.restockText]}>
                {t('onboarding.lowStock', 'Low Stock')}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Interactive Actions */}
      {selectedItem === item.id && showActions && (
        <Animated.View style={styles.actionsContainer}>
          <View style={styles.actionButtons}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.background }]}
              onPress={() => handleQuantityUpdate(item.id, -1)}
            >
              <FontAwesome name="minus" size={16} color={colors.primary} />
            </Pressable>
            
            <Text style={[typography.body, styles.actionLabel, { color: colors.text }]}>
              {t('onboarding.adjustQuantity', 'Adjust Quantity')}
            </Text>
            
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.background }]}
              onPress={() => handleQuantityUpdate(item.id, 1)}
            >
              <FontAwesome name="plus" size={16} color={colors.primary} />
            </Pressable>
          </View>
          
          <Pressable style={[styles.editButton, { backgroundColor: colors.primary }]}>
            <FontAwesome name="pencil" size={14} color={colors.primaryText} />
            <Text style={[typography.caption, styles.editText, { color: colors.primaryText }]}>
              {t('onboarding.editItem', 'Edit Item')}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[typography.h1, styles.title, { color: colors.text }]}>
          {t('onboarding.inventoryDemo', 'Inventory Management')}
        </Text>
        <Text style={[typography.body, styles.subtitle, { color: colors.subtext }]}>
          {t('onboarding.inventoryDemoDesc', 'Track and manage your items with ease')}
        </Text>
      </View>

      {/* Demo Items List */}
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <FlatList
          data={demoItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />

        {/* Interactive Tips */}
        {selectedItem && (
          <View style={[styles.tipsContainer, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
            <FontAwesome name="hand-pointer-o" size={20} color={colors.primary} />
            <View style={styles.tipContent}>
              <Text style={[typography.body, styles.tipTitle, { color: colors.primary }]}>
                {t('onboarding.tryIt', 'Try It Out!')}
              </Text>
              <Text style={[typography.caption, styles.tipText, { color: colors.text }]}>
                {t('onboarding.inventoryTip', 'Tap the + and - buttons to adjust quantities, or tap Edit to modify item details.')}
              </Text>
            </View>
          </View>
        )}
      </Animated.View>

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
          style={[styles.navButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/onboarding/demo-scanning')}
        >
          <Text style={[typography.button, { color: colors.primaryText, marginRight: 8 }]}>
            {t('onboarding.tryScanning', 'Try Scanning')}
          </Text>
          <FontAwesome name="barcode" size={16} color={colors.primaryText} />
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
  listContainer: { paddingBottom: 20 },
  itemCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { fontWeight: 'bold', marginBottom: 4 },
  itemLocation: {},
  quantityContainer: { alignItems: 'flex-end' },
  quantity: { fontWeight: 'bold', marginBottom: 4 },
  restockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  restockText: { color: 'white', fontWeight: 'bold' },
  actionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
    gap: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: { fontWeight: '600' },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  editText: { fontWeight: 'bold' },
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