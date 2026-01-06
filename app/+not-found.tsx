import { Link, Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { typography } from '../styles/typography';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  // Helper to clear the stuck state
  const handleReset = async () => {
    try {
      // Clear the specific key causing the loop
      await AsyncStorage.removeItem('ONBOARDING_COMPLETED');
      // Navigate to the absolute root to re-trigger the initial layout check
      router.replace('/'); 
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('common.oops', 'Oops!') }} />
      <View style={styles.container}>
        <Text style={[typography.h1, styles.title]}>
          {t('notFound.title', "This screen doesn't exist.")}
        </Text>

        {/* Standard Go Home Link */}
        <Link href="/" style={styles.link}>
          <Text style={[typography.body, styles.linkText]}>
            {t('notFound.goHome', 'Go to home screen!')}
          </Text>
        </Link>

        {/* 🛠 DEV FIX: Button to unstick your devices */}
        <Pressable onPress={handleReset} style={styles.resetButton}>
          <Text style={[typography.button, { color: '#fff' }]}>
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
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FF5252', // Red to indicate a destructive/dev action
    borderRadius: 8,
  },
});