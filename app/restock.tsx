import { useTranslation } from 'react-i18next';
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList, Modal, TextInput } from 'react-native';
import { useFocusEffect, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';
import { useAuth } from '../providers/AuthProvider';
import { logActivity } from '../lib/logger';

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
};

// --- SUB-COMPONENT: BULK MODAL ---
const BulkStockModal = ({ visible, onClose, onSubmit }: { visible: boolean; onClose: () => void; onSubmit: (amount: number) => void }) => {
  const { t } = useTranslation();
  const { colors } = useTheme(); 
  const [amount, setAmount] = useState('');

  const handleSubmit = () => {
    const amountToAdd = parseInt(amount, 10);
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      showError(t('restock.invalidNo'), t('restock.enterValid'));
      return;
    }
    onSubmit(amountToAdd);
    setAmount('');
  };

  return (
    <Modal transparent={true} visible={visible} onRequestClose={onClose} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[typography.h3, styles.modalTitle, { color: colors.text }]}>{t('restock.bulkPromptTitle')}</Text>
          <Text style={[typography.body, styles.modalSubtitle, { color: colors.subtext }]}>{t('restock.bulkPromptMessage')}</Text>
          <TextInput
            style={[typography.body, styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder={t('restock.amountPlaceholder')}
            placeholderTextColor={colors.subtext}
            autoFocus={true}
          />
          <View style={styles.modalButtonContainer}>
            <Pressable style={[styles.modalButton, { backgroundColor: colors.border }]} onPress={onClose}>
              <Text style={[typography.button, styles.modalButtonText, { color: colors.text }]}>{t('general.cancel')}</Text>
            </Pressable>
            <Pressable style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
              <Text style={[typography.button, styles.modalButtonText, { color: colors.primaryText }]}>{t('general.submit')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function RestockScreen() {
  const { t } = useTranslation();
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const { workgroup } = useAuth(); 
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // --- COPILOT HOOK ---
  const { start: startTour } = useCopilot();

  useEffect(() => {
    const checkFirstTime = async () => {
        try {
            const hasSeen = await AsyncStorage.getItem('HAS_SEEN_RESTOCK_TOUR');
            if (!hasSeen) {
                setTimeout(() => startTour(), 1000); 
                await AsyncStorage.setItem('HAS_SEEN_RESTOCK_TOUR', 'true');
            }
        } catch (e) { console.warn(e); }
    };
    checkFirstTime();
  }, []);

  const fetchRestockItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_restock_items');
    if (error) console.error(t('general.error'), error.message);
    else setRestockItems(data || []);
    setLoading(false);
  }, [t]);

  useFocusEffect(useCallback(() => { fetchRestockItems(); }, [fetchRestockItems]));

  const updateItemQuantity = async (item: RestockItem, newQuantity: number) => {
    if (newQuantity < 0) return;
    const { error } = await supabase.from('items').update({ quantity: newQuantity }).eq('id', item.id);
    if (error) { showError(t('general.error'), t('general.errorQuantity')); return; }
    
    if (workgroup?.id) {
      const change = newQuantity - item.quantity;
      logActivity({ workgroup_id: workgroup.id, item_id: item.id, item_name: item.name, action: 'RESTOCK', change_amount: change, final_quantity: newQuantity });
    }

    const updatedItems = restockItems.map(i => i.id === item.id ? { ...i, quantity: newQuantity } : i);
    setRestockItems(updatedItems.filter(i => i.quantity <= i.restock_threshold));
  };

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  };

  const openBulkStockModal = () => setIsModalVisible(true);

  const handleBulkStockSubmit = async (amountToAdd: number) => {
    setIsModalVisible(false);
    setLoading(true);
    const itemsToUpdate = restockItems.filter(item => selectedItems.includes(item.id));
    const updates = itemsToUpdate.map(item => ({ id: item.id, new_quantity: item.quantity + amountToAdd }));
    
    const { error } = await supabase.rpc('bulk_update_item_quantities', { updates });
    if (error) {
      showError(t('general.error'), error.message);
    } else {
      if (workgroup?.id) {
        itemsToUpdate.forEach(item => {
          logActivity({ workgroup_id: workgroup.id, item_id: item.id, item_name: item.name, action: 'RESTOCK', change_amount: amountToAdd, final_quantity: item.quantity + amountToAdd });
        });
      }
      showSuccess(t('general.success'), t('restock.restocked', { count: selectedItems.length }));
    }
    
    setSelectedItems([]);
    await fetchRestockItems(); 
    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: '' }} />
      <BulkStockModal visible={isModalVisible} onClose={() => setIsModalVisible(false)} onSubmit={handleBulkStockSubmit} />
      {loading ? <ActivityIndicator style={styles.centered} size="large" color={colors.primary} /> : (
        <FlatList
          data={restockItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const isSelected = selectedItems.includes(item.id);
            
            if (index === 0) {
               return (
                <View style={[styles.itemContainer, { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : colors.border }]}>
                  <CopilotStep text= {t('pilot.highlight')} order={1} name="selectItem">
                    <WalkablePressable onPress={() => toggleSelectItem(item.id)} style={styles.checkbox}>
                        <FontAwesome name={isSelected ? 'check-square-o' : 'square-o'} size={24} color={colors.primary} />
                    </WalkablePressable>
                  </CopilotStep>
                  <View style={styles.itemDetails}>
                    <Text style={[typography.body, styles.itemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[typography.body, styles.itemQuantityText, { color: colors.subtext }]}>{t('restock.current')} {item.quantity} | {t('restock.needs')} {item.restock_threshold}</Text>
                  </View>
                  <View style={styles.quantityControls}>
                    <Pressable style={[styles.quantityButton, { backgroundColor: colors.background }]} onPress={() => updateItemQuantity(item, item.quantity - 1)}>
                      <FontAwesome name="minus" size={16} color={colors.primary} />
                    </Pressable>
                    <Pressable style={[styles.quantityButton, { backgroundColor: colors.background }]} onPress={() => updateItemQuantity(item, item.quantity + 1)}>
                      <FontAwesome name="plus" size={16} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>
               );
            }

            return (
              <View style={[styles.itemContainer, { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : colors.border }]}>
                <Pressable onPress={() => toggleSelectItem(item.id)} style={styles.checkbox}>
                  <FontAwesome name={isSelected ? 'check-square-o' : 'square-o'} size={24} color={colors.primary} />
                </Pressable>
                <View style={styles.itemDetails}>
                  <Text style={[typography.body, styles.itemName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[typography.body, styles.itemQuantityText, { color: colors.subtext }]}>{t('restock.current')} {item.quantity} | {t('restock.needs')} {item.restock_threshold}</Text>
                </View>
                <View style={styles.quantityControls}>
                  <Pressable style={[styles.quantityButton, { backgroundColor: colors.background }]} onPress={() => updateItemQuantity(item, item.quantity - 1)}>
                    <FontAwesome name="minus" size={16} color={colors.primary} />
                  </Pressable>
                  <Pressable style={[styles.quantityButton, { backgroundColor: colors.background }]} onPress={() => updateItemQuantity(item, item.quantity + 1)}>
                    <FontAwesome name="plus" size={16} color={colors.primary} />
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={() => (
             <View style={styles.centered}>
               <Text style={[typography.caption, styles.emptyText, { color: colors.subtext }]}>{t('restock.allStocked')}</Text>
             </View>
          )}
          contentContainerStyle={{ padding: 10 }}
        />
      )}
      
      {selectedItems.length > 0 && (
        <CopilotStep text= {t('pilot.stockbulk')} order={2} name="bulkAction">
            <WalkableView style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]} collapsable={false}>
                <Pressable style={[styles.bulkButton, { backgroundColor: colors.success }]} onPress={openBulkStockModal}>
                    <Text style={[typography.button, styles.bulkButtonText, { color: colors.primaryText }]}>{t('restock.bulkButton', { count: selectedItems.length })}</Text>
                </Pressable>
            </WalkableView>
        </CopilotStep>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  itemContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, marginVertical: 8, borderRadius: 8, borderWidth: 1 },
  checkbox: { paddingRight: 16 },
  itemDetails: { flex: 1 },
  itemName: { fontWeight: '600' },
  itemQuantityText: { marginTop: 2 },
  quantityControls: { flexDirection: 'row', alignItems: 'center' },
  quantityButton: { padding: 8, borderRadius: 24, marginLeft: 8 },
  emptyText: { },
  footer: { padding: 24, borderTopWidth: 1 },
  bulkButton: { padding: 16, borderRadius: 8, alignItems: 'center' },
  bulkButtonText: { fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { width: '85%', borderRadius: 8, padding: 24, alignItems: 'center' },
  modalTitle: { fontWeight: 'bold', marginBottom: 8 },
  modalSubtitle: { marginBottom: 24, textAlign: 'center' },
  modalInput: { width: '100%', borderWidth: 1, borderRadius: 8, padding: 16, textAlign: 'center' },
  modalButtonContainer: { flexDirection: 'row', marginTop: 24, width: '100%' },
  modalButton: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center', marginHorizontal: 8 },
  modalButtonText: { fontWeight: 'bold' },
});