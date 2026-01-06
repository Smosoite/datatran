import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Contexts
import { useTheme } from '../../providers/ThemeProvider'; // Check your import path
import { useOnboarding } from '../../providers/OnboardingProvider'; // Check your import path
import { typography } from '../../styles/typography'; // Check your import path

export default function PaywallScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { completeOnboarding } = useOnboarding();
  
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<'monthly' | 'yearly'>('yearly');

  // Placeholder packages - replace with real data (e.g., RevenueCat)
  const packages = {
    monthly: { id: 'monthly_id', price: '$9.99', period: t('paywall.month', 'month') },
    yearly: { id: 'yearly_id', price: '$89.99', period: t('paywall.year', 'year'), savings: '25%' }
  };

  /**
   * CRITICAL FUNCTION:
   * This is where we break the loop. We only mark onboarding as complete
   * (and trigger the home redirect) AFTER the user is done with this screen.
   */
  const finalizeOnboardingAndRedirect = async () => {
    try {
      setLoading(true);
      
      // 1. Mark persistent storage so they don't see onboarding on next app launch
      await AsyncStorage.setItem('ONBOARDING_COMPLETED', 'true');
      
      // 2. Update Context state
      // This function updates the provider state to `true`.
      // The Root Layout listens to this state and will automatically 
      // redirect the user to /(tabs)/home.
      if (completeOnboarding) {
        await completeOnboarding();
      } else {
        // Fallback safety net if context is missing
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // Even if error, force redirect to avoid trapping user
      router.replace('/(tabs)/home');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      // --- IMPLEMENT PURCHASE LOGIC HERE ---
      // await Purchases.purchasePackage(packageToBuy);
      
      // Simulating API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // On success, finalize
      await finalizeOnboardingAndRedirect();

    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e.message || t('paywall.purchaseFailed', 'Purchase failed'));
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      // --- IMPLEMENT RESTORE LOGIC HERE ---
      Alert.alert(t('common.success', 'Success'), t('paywall.restoreSuccess', 'Purchases restored'));
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  // Logic for the "X" button
  const handleClose = async () => {
    // If your app allows free usage, this lets them into the app.
    await finalizeOnboardingAndRedirect();
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.surface]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header / Close Button */}
          <View style={styles.header}>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <FontAwesome name="times" size={24} color={colors.textSecondary} />
            </Pressable>
            <Pressable onPress={handleRestore}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {t('paywall.restore', 'Restore')}
              </Text>
            </Pressable>
          </View>

          {/* Hero Image / Icon */}
          <View style={styles.heroContainer}>
            <FontAwesome name="diamond" size={64} color={colors.primary} />
            <Text style={[typography.h1, styles.title, { color: colors.text }]}>
              {t('paywall.unlockPro', 'Unlock Pro Access')}
            </Text>
            <Text style={[typography.body, styles.subtitle, { color: colors.textSecondary }]}>
              {t('paywall.subtitle', 'Unlimited items, team collaboration, and advanced analytics.')}
            </Text>
          </View>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            <FeatureItem text={t('paywall.feature1', 'Unlimited Warehouses')} colors={colors} />
            <FeatureItem text={t('paywall.feature2', 'Barcode Scanning')} colors={colors} />
            <FeatureItem text={t('paywall.feature3', 'Team Roles & Permissions')} colors={colors} />
            <FeatureItem text={t('paywall.feature4', 'Export Reports (CSV/PDF)')} colors={colors} />
          </View>

          {/* Pricing Options */}
          <View style={styles.plansContainer}>
            {/* Yearly Plan */}
            <Pressable 
              style={[
                styles.planCard, 
                selectedPackage === 'yearly' && { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.surfaceHighlight || '#f0f0f0' }
              ]}
              onPress={() => setSelectedPackage('yearly')}
            >
              <View style={styles.planHeader}>
                <Text style={[typography.h3, { color: colors.text }]}>{t('paywall.yearly', 'Yearly')}</Text>
                <View style={[styles.badge, { backgroundColor: colors.success || 'green' }]}>
                  <Text style={styles.badgeText}>{t('paywall.savePercent', 'SAVE 25%')}</Text>
                </View>
              </View>
              <Text style={[typography.h2, { color: colors.primary }]}>{packages.yearly.price}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {packages.yearly.price} / {t('paywall.year', 'year')}
              </Text>
            </Pressable>

            {/* Monthly Plan */}
            <Pressable 
              style={[
                styles.planCard, 
                selectedPackage === 'monthly' && { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.surfaceHighlight || '#f0f0f0' }
              ]}
              onPress={() => setSelectedPackage('monthly')}
            >
              <View style={styles.planHeader}>
                <Text style={[typography.h3, { color: colors.text }]}>{t('paywall.monthly', 'Monthly')}</Text>
              </View>
              <Text style={[typography.h2, { color: colors.primary }]}>{packages.monthly.price}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {packages.monthly.price} / {t('paywall.month', 'month')}
              </Text>
            </Pressable>
          </View>

          {/* Terms */}
          <Text style={[typography.caption, styles.termsText, { color: colors.textTertiary }]}>
            {t('paywall.terms', 'Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period.')}
          </Text>

        </ScrollView>

        {/* Footer Action Button */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Pressable 
            style={[styles.subscribeButton, { backgroundColor: colors.primary }]}
            onPress={handlePurchase}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={[typography.button, { color: 'white' }]}>
                {selectedPackage === 'yearly' 
                  ? t('paywall.startTrialYearly', 'Start 7-Day Free Trial') 
                  : t('paywall.subscribeMonthly', 'Subscribe Monthly')}
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Helper Component for Features
function FeatureItem({ text, colors }: { text: string, colors: any }) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.checkCircle, { backgroundColor: colors.primaryLight || '#e0e0e0' }]}>
        <FontAwesome name="check" size={12} color={colors.primary} />
      </View>
      <Text style={[typography.body, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  
  heroContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  
  featuresContainer: {
    marginBottom: 32,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  plansContainer: {
    gap: 16,
    marginBottom: 24,
  },
  planCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.5)', 
    borderWidth: 1,
    borderColor: 'transparent',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
  },
  
  termsText: {
    textAlign: 'center',
    marginBottom: 20,
  },
  
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'transparent', 
    borderTopWidth: 0,
  },
  subscribeButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});