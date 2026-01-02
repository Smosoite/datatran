import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../providers/ThemeProvider';
import { showError, showSuccess } from '../../lib/toast';
import { typography } from '../../styles/typography';

// --- COPILOT IMPORTS ---
import { CopilotStep, walkthroughable, useCopilot } from "react-native-copilot";
import AsyncStorage from '@react-native-async-storage/async-storage';

const WalkableTextInput = walkthroughable(TextInput);
const WalkablePressable = walkthroughable(Pressable);
const WalkableView = walkthroughable(View);

export default function EditItemScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme(); 
  const router = useRouter();

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [restockThreshold, setRestockThreshold] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // --- 1. LAYOUT STATE ---
  const [isLayoutReady, setIsLayoutReady] = useState(false);

  // --- COPILOT HOOK ---
  const { start: startTour } = useCopilot();

  // --- 2. UPDATED TOUR LOGIC ---
  useEffect(() => {
    // Wait until data fetch is done AND the screen layout is physically ready
    if (loading || !isLayoutReady) return;

    const checkFirstTime = async () => {
        try {
            const hasSeen = await AsyncStorage.getItem('HAS_SEEN_EDIT_ITEM_TOUR');
            if (!hasSeen) {
                // Short delay to ensure the form is fully interactive and focused
                setTimeout(() => startTour(), 600);
                await AsyncStorage.setItem('HAS_SEEN_EDIT_ITEM_TOUR', 'true');
            }
        } catch (e) { console.warn(e); }
    };
    checkFirstTime();
  }, [loading, isLayoutReady]);

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
       showError(t('general.error'), t('general.failedItem'));
      } else if (data) {
        setName(data.name);
        setQuantity(data.quantity.toString());
        setRestockThreshold(data.restock_threshold.toString());
      }
      setLoading(false);
    };
    fetchItem();
  }, [id, t]);

  const handleUpdate = async () => {
    if (!name || !quantity || !restockThreshold || !id) {
      showError(t('general.error'), t('general.fillFields'));
      return;
    }
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('items')
        .update({
          name: name.trim(),
          quantity: parseInt(quantity, 10),
          restock_threshold: parseInt(restockThreshold, 10),
        })
        .eq('id', id);

      if (error) throw error;
      showSuccess(t('general.success'), t('general.itemSuccess'));
      router.back();
    } catch (error: any) {
     showError(t('general.error'), error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: colors.background }} size="large" color={colors.primary} />;
  }

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: colors.background }} 
      contentContainerStyle={styles.contentContainer}
      // --- 3. TRIGGER LAYOUT READY ---
      onLayout={() => setIsLayoutReady(true)}
    >
      
      {/* STEP 1: Edit Fields */}
      <CopilotStep text={t('pilot.details')} order={1} name="editFields">
        <WalkableView collapsable={false}>
            <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.itemName*')}</Text>
            <TextInput style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={name} onChangeText={setName} />
            
            <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.quantity*')}</Text>
            <TextInput style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
            
            <Text style={[typography.h3, styles.label, { color: colors.text }]}>{t('item.restockThreshold*')}</Text>
            <TextInput style={[typography.body, styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={restockThreshold} onChangeText={setRestockThreshold} keyboardType="numeric" />
        </WalkableView>
      </CopilotStep>
      
      {/* STEP 2: Save Button */}
      <CopilotStep text={t('pilot.save')} order={2} name="saveBtn">
        <WalkablePressable 
          collapsable={false} // Android measurement fix
          style={[styles.button, { backgroundColor: colors.primary }]} 
          onPress={handleUpdate} 
          disabled={updating}
        >
            {updating ? (
            <ActivityIndicator color={colors.text || '#fff'} />
            ) : (
            <Text style={[typography.button, styles.buttonText, { color: colors.text || '#fff' }]}>{t('general.save')}</Text>
            )}
        </WalkablePressable>
      </CopilotStep>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: { padding: 24 },
  label: { marginBottom: 8, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 24 },
  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 18 },
  buttonText: { fontWeight: 'bold' },
});