import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { typography } from '../../styles/typography';
import { FontAwesome } from '@expo/vector-icons';

const demoBarcodes = [
  { code: '123456789012', name: 'Copper Wire Spool', action: 'found' },
  { code: '987654321098', name: 'New Item', action: 'add' },
  { code: '456789123456', name: 'LED Light Bulbs', action: 'found' },
];

export default function DemoScanningScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  
  const fadeAnim = new Animated.Value(0);
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (isScanning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isScanning]);

  const handleScanDemo = (demoBarcode: string) => {
    setBarcode(demoBarcode);
    setIsScanning(true);
    
    // Simulate scanning delay
    setTimeout(() => {
      const result = demoBarcodes.find(b => b.code === demoBarcode);
      setScanResult(result);
      setIsScanning(false);
    }, 2000);
  };

  const handleManualEntry = () => {
    if (barcode.length >= 8) {
      const result = demoBarcodes.find(b => b.code === barcode) || {
        code: barcode,
        name: 'Unknown Item',
        action: 'add'
      };
      setScanResult(result);
    }
  };

  const resetDemo = () => {
    setBarcode('');
    setScanResult(null);
    setIsScanning(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[typography.h1, styles.title, { color: colors.text }]}>
          {t('onboarding.scanningDemo', 'Barcode Scanning')}
        </Text>
        <Text style={[typography.body, styles.subtitle, { color: colors.subtext }]}>
          {t('onboarding.scanningDemoDesc', 'Quickly add and find items with barcode scanning')}
        </Text>
      </View>

      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        {/* Scanner Interface */}
        <View style={[styles.scannerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {!isScanning && !scanResult && (
            <View style={styles.scannerIdle}>
              <FontAwesome name="barcode" size={64} color={colors.subtext} />
              <Text style={[typography.body, styles.scannerText, { color: colors.subtext }]}>
                {t('onboarding.readyToScan', 'Ready to scan')}
              </Text>
            </View>
          )}

          {isScanning && (
            <Animated.View 
              style={[
                styles.scannerActive,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <FontAwesome name="search" size={48} color={colors.primary} />
              <Text style={[typography.body, styles.scannerText, { color: colors.primary }]}>
                {t('onboarding.scanning', 'Scanning...')}
              </Text>
              <Text style={[typography.caption, styles.barcodeText, { color: colors.text }]}>
                {barcode}
              </Text>
            </Animated.View>
          )}

          {scanResult && (
            <View style={styles.scanResult}>
              <FontAwesome 
                name={scanResult.action === 'found' ? 'check-circle' : 'plus-circle'} 
                size={48} 
                color={scanResult.action === 'found' ? colors.success : colors.primary} 
              />
              <Text style={[typography.h3, styles.resultTitle, { color: colors.text }]}>
                {scanResult.action === 'found' 
                  ? t('onboarding.itemFound', 'Item Found!') 
                  : t('onboarding.newItem', 'New Item')
                }
              </Text>
              <Text style={[typography.body, styles.resultName, { color: colors.text }]}>
                {scanResult.name}
              </Text>
              <Text style={[typography.caption, styles.resultCode, { color: colors.subtext }]}>
                {t('onboarding.barcode', 'Barcode')}: {scanResult.code}
              </Text>
            </View>
          )}
        </View>

        {/* Demo Actions */}
        {!scanResult && (
          <View style={styles.actionsContainer}>
            <Text style={[typography.body, styles.actionsTitle, { color: colors.text }]}>
              {t('onboarding.tryTheseBarcodes', 'Try these demo barcodes:')}
            </Text>
            
            {demoBarcodes.map((demo, index) => (
              <Pressable
                key={index}
                style={[styles.demoButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleScanDemo(demo.code)}
                disabled={isScanning}
              >
                <View style={styles.demoButtonContent}>
                  <FontAwesome name="barcode" size={16} color={colors.primary} />
                  <Text style={[typography.caption, styles.demoCode, { color: colors.text }]}>
                    {demo.code}
                  </Text>
                  <Text style={[typography.caption, styles.demoName, { color: colors.subtext }]}>
                    {demo.name}
                  </Text>
                </View>
                <FontAwesome 
                  name={demo.action === 'found' ? 'search' : 'plus'} 
                  size={14} 
                  color={colors.subtext} 
                />
              </Pressable>
            ))}

            {/* Manual Entry */}
            <View style={styles.manualEntry}>
              <Text style={[typography.body, styles.manualTitle, { color: colors.text }]}>
                {t('onboarding.orEnterManually', 'Or enter manually:')}
              </Text>
              <View style={styles.manualInputContainer}>
                <TextInput
                  style={[
                    typography.body,
                    styles.manualInput,
                    { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }
                  ]}
                  placeholder={t('onboarding.enterBarcode', 'Enter barcode number')}
                  placeholderTextColor={colors.subtext}
                  value={barcode}
                  onChangeText={setBarcode}
                  keyboardType="numeric"
                />
                <Pressable
                  style={[
                    styles.manualButton,
                    { 
                      backgroundColor: barcode.length >= 8 ? colors.primary : colors.border,
                      opacity: barcode.length >= 8 ? 1 : 0.5,
                    }
                  ]}
                  onPress={handleManualEntry}
                  disabled={barcode.length < 8}
                >
                  <FontAwesome name="search" size={16} color={colors.primaryText} />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Result Actions */}
        {scanResult && (
          <View style={styles.resultActions}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                // In real app, this would navigate to add/edit item
                console.log('Navigate to item action');
              }}
            >
              <Text style={[typography.button, { color: colors.primaryText }]}>
                {scanResult.action === 'found' 
                  ? t('onboarding.viewItem', 'View Item') 
                  : t('onboarding.addItem', 'Add Item')
                }
              </Text>
            </Pressable>
            
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={resetDemo}
            >
              <Text style={[typography.button, { color: colors.text }]}>
                {t('onboarding.scanAnother', 'Scan Another')}
              </Text>
            </Pressable>
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
          onPress={() => router.push('app/onboarding/completion')}
        >
          <Text style={[typography.button, { color: colors.primaryText, marginRight: 8 }]}>
            {t('onboarding.almostDone', 'Almost Done!')}
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
  scannerContainer: {
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  scannerIdle: { alignItems: 'center', gap: 12 },
  scannerActive: { alignItems: 'center', gap: 12 },
  scannerText: { fontWeight: '600' },
  barcodeText: { fontFamily: 'monospace', letterSpacing: 2 },
  scanResult: { alignItems: 'center', gap: 8 },
  resultTitle: { fontWeight: 'bold' },
  resultName: { fontWeight: '600' },
  resultCode: { fontFamily: 'monospace' },
  actionsContainer: { gap: 12 },
  actionsTitle: { fontWeight: '600', marginBottom: 8 },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  demoButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  demoCode: { fontFamily: 'monospace', fontWeight: 'bold' },
  demoName: {},
  manualEntry: { marginTop: 16, gap: 8 },
  manualTitle: { fontWeight: '600' },
  manualInputContainer: { flexDirection: 'row', gap: 8 },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'monospace',
  },
  manualButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultActions: { gap: 12, marginTop: 24 },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
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