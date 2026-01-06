import { Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { typography } from '../styles/typography';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  // 1. Force navigation to the Dashboard
  // This bypasses the root redirect logic and sends you straight to the tabs
  const handleForceHome = () => {
    // Navigate explicitly to the tabs container
    router.replace('/(tabs)/home'); 
  };

  // 2. Reset Memory and restart
  // This removes the flag and sends you to the absolute root to re-trigger onboarding
  const handleReset = async () => {
    try {
      await AsyncStorage.removeItem('ONBOARDING_COMPLETED');
      console.log('User Reset: ONBOARDING_COMPLETED removed');
      
      // Use replace instead of reload to avoid crashing
      router.replace('/'); 
    } catch (e) {
      console.error("Reset failed", e);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={[typography.h1, styles.title]}>
          {t('notFound.title', "This screen doesn't exist.")}
        </Text>
        <Text style={[typography.caption, {marginBottom: 30, color: '#666'}]}>
          Debug Path: {router.usePathname()}
        </Text>

        {/* Option 1: Try to go to the Dashboard (Tabs) */}
        <Pressable onPress={handleForceHome} style={styles.mainButton}>
           <Text style={[typography.button, { color: '#fff' }]}>
             {t('notFound.goHome', 'Force Go to Dashboard')}
           </Text>
        </Pressable>

        {/* Option 2: Wipe Memory and Restart */}
        <Pressable onPress={handleReset} style={styles.resetButton}>
          <Text style={[typography.button, { color: '#FF5252' }]}>
            {t('dev.resetOnboarding', 'DEV: Reset Onboarding')}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  title: {
    marginBottom: 10,
    textAlign: 'center',
  },
  mainButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  resetButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF5252',
    width: '100%',
    alignItems: 'center',
  },
});