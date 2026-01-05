import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { showError, showSuccess } from '../../lib/toast';
import { typography } from '../../styles/typography';
import { FontAwesome } from '@expo/vector-icons';

export default function OnboardingAddFirstItem() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  // State
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [loading, setLoading] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  const handleAddItem = async () => {
    if (!name.trim()) return showError(t('general.error'), "Please name your item.");
    if (selectedLocationIds.length === 0) return showError(t('general.error'), "Please select a location.");

    setLoading(true);
    // Fake "Saving" delay
    setTimeout(() => {
        setLoading(false);
        showSuccess(t('general.success'), "First item added successfully!");
        router.push('/onboarding/completion');
    }, 800);
  };

  const toggleLocation = (id: string) => {
    if (selectedLocationIds.includes(id)) {
        setSelectedLocationIds(prev => prev.filter(x => x !== id));
    } else {
        setSelectedLocationIds([id]); 
    }
  };

  // Generate a dummy shelf for the demo
  const dummySlots = useMemo(() => {
    const slots = [];
    const rows = ['1', '2', '3', '4', '5'];
    const cols = ['1', '2', '3', '4', '5'];
    
    for (const r of rows) {
        for (const c of cols) {
            slots.push({ id: `demo-${r}-${c}`, row: r, column: c });
        }
    }
    return slots;
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      <View style={styles.header}>
        <Text style={[typography.h1, styles.title, { color: colors.text }]}>
          {t('onboarding.addItem', 'Add Your First Item')}
        </Text>
        <Text style={[typography.body, styles.subtitle, { color: colors.subtext }]}>
          Give it a name and tell us where it goes.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Form */}
        <View style={styles.formGroup}>
            <Text style={[typography.caption, { color: colors.text, marginBottom: 8 }]}>ITEM NAME</Text>
            <TextInput 
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Copper Wire"
                placeholderTextColor={colors.subtext}
                value={name}
                onChangeText={setName}
            />
        </View>

        <View style={styles.formGroup}>
            <Text style={[typography.caption, { color: colors.text, marginBottom: 8 }]}>QUANTITY</Text>
            <TextInput 
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
            />
        </View>

        {/* Location Selector */}
        <Text style={[typography.h3, { color: colors.text, marginTop: 20, marginBottom: 10 }]}>Select Location</Text>
        
        <View style={styles.gridContainer}>
            <View style={{marginBottom: 10}}>
                <Text style={{color: colors.subtext, fontSize: 12, marginBottom: 4}}>Shelf A</Text>
                <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
                    {dummySlots.map((slot) => {
                        const isSelected = selectedLocationIds.includes(slot.id);
                        return (
                            <Pressable 
                                key={slot.id}
                                onPress={() => toggleLocation(slot.id)}
                                style={[
                                    styles.slot, 
                                    { 
                                        backgroundColor: isSelected ? colors.primary : colors.card,
                                        borderColor: colors.border 
                                    }
                                ]}
                            >
                                <Text style={{ fontSize: 10, color: isSelected ? '#fff' : colors.text }}>
                                    {slot.row}-{slot.column}
                                </Text>
                            </Pressable>
                        )
                    })}
                </View>
            </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
         <Pressable 
            style={[styles.button, { backgroundColor: colors.primary, opacity: (!name || selectedLocationIds.length === 0) ? 0.5 : 1 }]}
            onPress={handleAddItem}
            disabled={loading || !name || selectedLocationIds.length === 0}
         >
            {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                    <Text style={[typography.button, { color: colors.primaryText }]}>Create Item</Text>
                    <FontAwesome name="check" size={16} color={colors.primaryText} style={{marginLeft: 8}} />
                </>
            )}
         </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20 },
  title: { textAlign: 'center', marginBottom: 8 },
  subtitle: { textAlign: 'center' },
  content: { paddingHorizontal: 24, paddingBottom: 100 },
  formGroup: { marginBottom: 16 },
  input: { padding: 16, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  gridContainer: { marginTop: 10 },
  slot: { width: 40, height: 30, borderRadius: 6, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  footer: { position: 'absolute', bottom: 30, left: 24, right: 24 },
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12 }
});