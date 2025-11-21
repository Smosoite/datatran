// components/ConfirmationModal.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { useTranslation } from 'react-i18next';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmationModal = ({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmationModalProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Modal transparent={true} visible={visible} onRequestClose={onCancel} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{t(title)}</Text>
          <Text style={[styles.modalMessage, { color: colors.subtext }]}>{t(message)}</Text>
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, { backgroundColor: colors.border }]}
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>{t(cancelText)}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, { backgroundColor: isDestructive ? colors.danger : colors.primary }]}
              onPress={onConfirm}
            >
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>{t(confirmText)}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { width: '85%', borderRadius: 16, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalMessage: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  buttonContainer: { flexDirection: 'row', width: '100%' },
  button: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center', marginHorizontal: 8 },
  buttonText: { fontWeight: 'bold', fontSize: 16 },
});