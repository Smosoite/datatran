import { Link, Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, View, Pressable, DevSettings } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { typography } from '../styles/typography';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  // Helper to clear the stuck state
  const handleReset = async () => {
    try {
      // 1. Clear the data
      await AsyncStorage.removeItem('ONBOARDING_COMPLETED');
      
      // 2. Force a hard reload of the app bundle.
      // This is safer than router.replace() when the navigation state is broken.
      // It will trigger the app/_layout.tsx logic from the very beginning.
      if (__DEV__) {
        DevSettings.reload();
      } else {
        // Fallback for production builds where DevSettings might not work
        router.replace('/'); 
      }
    } catch (e) {
      console.error("Reset failed", e);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('common.oops', 'Oops!') }} />
      <View style={styles.container}>
        <Text style={[typography.h1, styles.title]}>
          {t('notFound.title', "This screen doesn't exist.")}
        </Text>

        {/* Standard Go Home Link - Points to Root, not specific tab */}
        <Link href="/" style={styles.link}>
          <Text style={[typography.body, styles.linkText]}>
            {t('notFound.goHome', 'Go to home screen!')}
          </Text>
        </Link>

        {/* 🛠 DEV FIX: Nuclear Button */}
        <Pressable onPress={handleReset} style={styles.resetButton}>
          <Text style={[typography.button, { color: '#fff' }]}>
            {t('dev.resetOnboarding', 'DEV: Hard Reset App')}
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
    marginBottom: 20,
    textAlign: 'center',
  },
  link: {
    marginTop: 16,
    paddingVertical: 16,
  },
  linkText: {
    color: '#2e78b7',
    textDecorationLine: 'underline',
  },
  resetButton: {
    marginTop: 40,
    paddingVertical: 14,
    paddingHorizontal: 30,
    backgroundColor: '#FF5252', 
    borderRadius: 8,
    elevation: 5, // Adds shadow on Android to make it look "clickable"
    shadowColor: '#000', // iOS Shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});