import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FontAwesome } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera'; 
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider'; // <--- ADDED THIS
import { showError } from '../lib/toast';
import { typography } from '../styles/typography';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function ScanScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme(); 
  const { profile } = useAuth(); // <--- GET PROFILE
  const router = useRouter();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!permission) {
        requestPermission();
    }
  }, [permission]);

  // --- ACTIONS ---

  const handleScanOrSubmit = async (code: string) => {
    if (scanned || loading) return; 
    if (!code.trim()) {
      showError(t('general.error'), t('scan.enterNum')); 
      return;
    }

    // Safety check for profile
    if (!profile?.workgroup_id) {
        showError(t('general.error'), "No active workgroup found.");
        return;
    }

    setScanned(true); 
    setLoading(true);
    setBarcode(code); 
    Keyboard.dismiss(); 

    try {
      // 2. Database Lookup SCOPED to Workgroup
      const { data: item, error } = await supabase
        .from('items')
        .select('id')
        .eq('barcode', code.trim())
        .eq('workgroup_id', profile.workgroup_id) // <--- CRITICAL FIX
        .single(); // It is now safe to use .single() because duplicates are impossible within one group

      // Handle actual DB errors (ignoring 'Item not found' code PGRST116)
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
       
      if (item) {
        // 3a. Item Exists in THIS workgroup -> Edit
        router.push(`/edit-item/${item.id}`);
      } else {
        // 3b. Item New (or exists in other groups but not here) -> Add
        router.push({ 
          pathname: '/select-location-modal', 
          params: { barcode: code.trim() } 
        });
      }
      
      // Delay resetting 'scanned' slightly
      setTimeout(() => {
         setScanned(false);
         setLoading(false);
      }, 1000);

    } catch (error: any) {
      console.error(error);
      showError(t('general.error'), error.message || t('general.errorOccurred'));
      setLoading(false); 
      setScanned(false); 
    }
  };

  if (!colors) return <View style={{flex:1}} />;

  if (!permission) {
    return <View style={{flex:1, backgroundColor: colors.background}} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.h3, { textAlign: 'center', color: colors.text, marginBottom: 20 }]}>
            {t('scan.permissionNeeded', 'Camera permission is required to scan barcodes.')}
        </Text>
        <Pressable onPress={requestPermission} style={[styles.actionButton, { backgroundColor: colors.primary }]}>
            <Text style={[typography.button, { color: '#fff' }]}>{t('scan.grantPermission', 'Grant Permission')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
        
        {/* CAMERA LAYER */}
        <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={scanned ? undefined : ({ data }) => handleScanOrSubmit(data)}
        >
            <View style={styles.overlay}>
                <View style={[styles.scanBox, { borderColor: scanned ? colors.success : '#fff' }]} />
                <Text style={{ color: '#fff', marginTop: 10, textAlign: 'center', ...typography.caption }}>
                    {loading ? t('scan.processing', 'Processing...') : t('scan.align', 'Align barcode within frame')}
                </Text>
            </View>
        </CameraView>

        {/* MANUAL INPUT LAYER */}
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.manualContainer}
        >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.manualContent, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            
             <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>
                {t('scan.orManual', 'Or enter manually')}
             </Text>
             
             <View style={styles.inputRow}>
                <TextInput
                  style={[
                    typography.body, 
                    styles.input, 
                    { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }
                  ]}
                  placeholder={t('scan.enterNum', 'e.g. 123456789')}
                  placeholderTextColor={colors.subtext || '#888'}
                  value={barcode}
                  onChangeText={setBarcode}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => handleScanOrSubmit(barcode)}
                  editable={!loading}
                />
                <Pressable 
                    style={[styles.goButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleScanOrSubmit(barcode)}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : <FontAwesome name="arrow-right" size={16} color="#fff" />}
                </Pressable>
             </View>

          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 150, 
  },
  scanBox: {
      width: 250,
      height: 250,
      borderWidth: 2,
      borderRadius: 20,
      backgroundColor: 'transparent'
  },
  manualContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
  },
  manualContent: {
      padding: 20,
      paddingBottom: 40,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderTopWidth: 1,
      elevation: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
  },
  sectionTitle: { 
    marginBottom: 12, 
    fontSize: 14, 
    opacity: 0.8,
    textAlign: 'center'
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  goButton: {
      width: 50,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  }
});