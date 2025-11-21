import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { useTranslation } from 'react-i18next';
import { typography } from '../styles/typography';

interface PasscodeModalProps {
  visible: boolean;
  title: string;
  message: string;
  onSubmit: (passcode: string) => void;
  onCancel: () => void;
}

export const PasscodeModal = ({
  visible,
  title,
  message,
  onSubmit,
  onCancel,
}: PasscodeModalProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [passcode, setPasscode] = React.useState('');

  const handleSubmit = () => {
    onSubmit(passcode);
    setPasscode(''); // Clear passcode on submit
  };

  const handleCancel = () => {
    onCancel();
    setPasscode(''); // Clear passcode on cancel
  };

  return (
    <Modal transparent={true} visible={visible} onRequestClose={handleCancel} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[typography.h2, styles.modalTitle, { color: colors.text }]}>{t(title)}</Text>
          <Text style={[typography.body, styles.modalMessage, { color: colors.subtext }]}>{t(message)}</Text>

          <TextInput
            style={[typography.h1, styles.passcodeInput, { color: colors.text, borderColor: colors.border }]}
            value={passcode}
            onChangeText={setPasscode}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6} // Set a max length
            autoFocus={true}
          />

          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, { backgroundColor: colors.border }]}
              onPress={handleCancel}
            >
              <Text style={[typography.button, styles.buttonText, { color: colors.text }]}>{t('general.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
            >
              <Text style={[typography.button, styles.buttonText, { color: colors.primaryText }]}>{t('general.submit')}</Text>
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
  modalTitle: { fontWeight: 'bold', marginBottom: 8 },
  modalMessage: { textAlign: 'center', marginBottom: 24 },
  passcodeInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 8, // Spreads out the dots
  },
  buttonContainer: { flexDirection: 'row', width: '100%' },
  button: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center', marginHorizontal: 8 },
  buttonText: { fontWeight: 'bold' },
});