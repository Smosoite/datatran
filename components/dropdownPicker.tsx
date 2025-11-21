import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, FlatList, TouchableOpacity } from 'react-native';
import { useTheme, Colors } from '../providers/ThemeProvider';

export const DropdownPicker = ({ label, options, selectedValue, onValueChange, placeholder }) => {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const { colors } = useTheme();
  const selectedLabel = options.find(o => o.value === selectedValue)?.label || placeholder;
  
  return (
    <>
      <Text style={[styles.label, { color: colors.text }]}>{t(label)}</Text> 
      <Pressable style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setModalVisible(true)}>
        <Text style={selectedValue ? { color: colors.text } : { color: colors.subtext }}>{selectedLabel}</Text>
      </Pressable>
      <Modal transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable style={[styles.modalItem, { borderBottomColor: colors.border }]} onPress={() => { onValueChange(item.value); setModalVisible(false); }}>
                  <Text style={{ color: colors.text }}>{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 16, marginBottom: 8, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 8, padding: 16, fontSize: 16, marginBottom: 24, justifyContent: 'center' },
  dropdownText: { fontSize: 16 },
  dropdownPlaceholder: { fontSize: 16 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderRadius: 8, padding: 8, width: '80%', maxHeight: '60%' },
  modalItem: { padding: 16, borderBottomWidth: 1 },
});