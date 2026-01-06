import { Stack, useRouter, usePathname } from 'expo-router';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message'; // Import Toast
import { typography } from '../styles/typography';
import { useTheme } from '../providers/ThemeProvider'; // Use your theme

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  // 1. Force navigation to the Dashboard
  const handleForceHome = () => {
    // We target /(tabs)/index specifically to avoid ambiguity
    // If the Auth logic kicks you out, it means your user state isn't valid for the dashboard yet.
    if (router.canGoBack()) {
        router.dismissAll();
    }
    router.replace('/(tabs)/index'); 
  };

  // 2. Reset Memory and restart
  const handleReset = async () => {
    try {
      // Clear all logic flags
      await AsyncStorage.multiRemove(['ONBOARDING_COMPLETED', 'DEMO_SUBSCRIPTION_ACTIVE']);
      
      // Show Toast
      Toast.show({
        type: 'success',
        text1: t('common.success', 'Success'),
        text2: t('notFound.resetConfirm', 'Memory wiped. Restarting app...'),
        position: 'top',
        visibilityTime: 2000,
      });

      // Wait 1.5s for toast to be readable, then reboot to root
      setTimeout(() => {
          // Navigate to root / to force the _layout AuthHandler to re-run from scratch
          router.dismissAll();
          router.replace('/'); 
      }, 1500);

    } catch (e) {
      console.error("Reset failed", e);
      Toast.show({
        type: 'error',
        text1: t('common.error', 'Error'),
        text2: t('notFound.resetError', 'Could not reset storage.')
      });
    }
  };

  // Guard: If colors aren't loaded yet
  if (!colors) return <View />;

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.header', 'Oops!') }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[typography.h1, styles.title, { color: colors.text }]}>
          {t('notFound.title', "This screen doesn't exist.")}
        </Text>
        <Text style={[typography.caption, {marginBottom: 30, color: colors.subtext}]}>
          Path: {pathname}
        </Text>

        {/* Option 1: Try to go to the Dashboard (Tabs) */}
        <Pressable onPress={handleForceHome} style={[styles.mainButton, { backgroundColor: colors.primary }]}>
           <Text style={[typography.button, { color: '#fff' }]}>
             {t('notFound.goHome', 'Force Go to Dashboard')}
           </Text>
        </Pressable>

        {/* Option 2: Wipe Memory and Restart */}
        <Pressable onPress={handleReset} style={[styles.resetButton, { borderColor: colors.danger }]}>
          <Text style={[typography.button, { color: colors.danger }]}>
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
  },
  title: {
    marginBottom: 10,
    textAlign: 'center',
  },
  mainButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resetButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
});