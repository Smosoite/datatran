import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, Keyboard } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { useTranslation } from 'react-i18next';
import { typography } from '../styles/typography';

interface QuantityModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onSubmit: (quantity: number) => void;
  onCancel: () => void;
}

export const QuantityModal = ({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onSubmit,
  onCancel,
}: QuantityModalProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');

  // Auto-focus the input when the modal becomes visible
  useEffect(() => {
    if (visible) {
      setAmount(''); // Clear previous amount
    }
  }, [visible]);

  const handleSubmit = () => {
    const quantity = parseInt(amount, 10);
    if (isNaN(quantity) || quantity <= 0) {
      // We can show a toast here if we want, but for now, just dismiss
      onCancel();
      return;
    }
    onSubmit(quantity);
    setAmount('');
  };

  const handleCancel = () => {
    onCancel();
    setAmount('');
  };

  return (
    <Modal transparent={true} visible={visible} onRequestClose={handleCancel} animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={Keyboard.dismiss}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[typography.h2, styles.modalTitle, { color: colors.text }]}>{t(title)}</Text>
          <Text style={[typography.body, styles.modalMessage, { color: colors.subtext }]}>{message}</Text>

          <TextInput
            style={[typography.h1, styles.input, { color: colors.text, borderColor: colors.border }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.subtext}
            autoFocus={true}
          />

          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, { backgroundColor: colors.border }]}
              onPress={handleCancel}
            >
              <Text style={[typography.button, styles.buttonText, { color: colors.text }]}>{t(cancelText)}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
            >
              <Text style={[typography.button, styles.buttonText, { color: colors.primaryText }]}>{t(confirmText)}</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { width: '85%', borderRadius: 16, padding: 24, alignItems: 'center' },
  modalTitle: { fontWeight: 'bold', marginBottom: 8 },
  modalMessage: { textAlign: 'center', marginBottom: 24 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: { flexDirection: 'row', width: '100%' },
  button: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center', marginHorizontal: 8 },
  buttonText: { fontWeight: 'bold' },
});