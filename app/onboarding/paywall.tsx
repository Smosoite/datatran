import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesPackage } from 'react-native-purchases';

// Contexts & Styles
import { useTheme } from '../../providers/ThemeProvider'; 
import { useOnboarding } from '../../providers/OnboardingProvider'; 
import { typography } from '../../styles/typography'; 

// --- CONFIGURATION ---
const API_KEYS = {
  apple: "appl_your_api_key_here",
  google: "goog_your_api_key_here"
};

// ⚡️ DEV SWITCH: Set to true to enable "Demo" mode (Bypasses Store)
const DEMO_MODE = true;

type PlanType = 'individual' | 'company';
type BillingCycle = 'monthly' | 'yearly';
type UserCount = 5 | 10 | 20 | 50 | 100;

export default function PaywallScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme(); 
  const router = useRouter();
  const { completeOnboarding } = useOnboarding();
   
  const [loading, setLoading] = useState(false);
  const [planType, setPlanType] = useState<PlanType>('individual');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [userCount, setUserCount] = useState<UserCount>(5);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);

  // 1. Initialize RevenueCat (or Mock Data)
  useEffect(() => {
    const setupPurchases = async () => {
      // --- DEMO MODE LOGIC ---
      if (DEMO_MODE) {
        console.log("DEV: Loading Mock Packages");
        setPackages([
            // Individual Monthly
            { 
              identifier: '$rc_monthly', 
              packageType: 'MONTHLY', 
              product: { identifier: 'monthly_pro', priceString: '$9.99', price: 9.99, title: 'Monthly', description: '', currencyCode: 'USD' }, 
              offeringIdentifier: 'default' 
            } as any,
            // Individual Yearly
            { 
              identifier: '$rc_annual', 
              packageType: 'ANNUAL', 
              product: { identifier: 'yearly_pro', priceString: '$99.99', price: 99.99, title: 'Yearly', description: '', currencyCode: 'USD' }, 
              offeringIdentifier: 'default' 
            } as any,
            // Company Plans
            ...[5, 10, 20, 50, 100].map(count => ({
                identifier: `company_${count}_yearly`,
                packageType: 'CUSTOM',
                product: { identifier: `company_${count}_yearly`, priceString: `$${count * 100}.00`, price: count * 100, title: `${count} Users`, description: '', currencyCode: 'USD' },
                offeringIdentifier: 'default'
            } as any))
        ]);
        return; 
      }
      // ---------------------

      try {
        if (Platform.OS === 'ios') {
          await Purchases.configure({ apiKey: API_KEYS.apple });
        } else if (Platform.OS === 'android') {
          await Purchases.configure({ apiKey: API_KEYS.google });
        }
        const offerings = await Purchases.getOfferings();
        if (offerings.current?.availablePackages) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (e) {
        console.error("Error fetching offerings", e);
      }
    };
    setupPurchases();
  }, []);

  // 2. Select Product Logic
  const selectedProduct = useMemo(() => {
    if (planType === 'individual') {
      const identifier = billingCycle === 'monthly' ? '$rc_monthly' : '$rc_annual'; 
      return packages.find(p => p.packageType === 'MONTHLY' && billingCycle === 'monthly' 
        || p.packageType === 'ANNUAL' && billingCycle === 'yearly'
        || p.identifier === identifier);
    } else {
      const targetId = `company_${userCount}_yearly`;
      return packages.find(p => p.product.identifier === targetId);
    }
  }, [packages, planType, billingCycle, userCount]);

  const displayPrice = selectedProduct ? selectedProduct.product.priceString : '...';

  // 3. Actions
  const finalizeOnboardingAndRedirect = async () => {
    try {
      setLoading(true);

      if (DEMO_MODE) {
        await AsyncStorage.setItem('DEMO_SUBSCRIPTION_ACTIVE', 'true');
      }

      if (completeOnboarding) {
        await completeOnboarding();
      }

      router.replace('/(tabs)');

    } catch (error) {
      console.error("Redirection error:", error);
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedProduct) {
      Alert.alert(t('common.error'), t('paywall.noProductFound', 'Product not available'));
      return;
    }

    setLoading(true);

    // --- DEMO MODE BYPASS ---
    if (DEMO_MODE) {
        setTimeout(async () => {
            console.log("DEV: Mock Purchase Successful - Redirecting to account creation");
            router.push('/sign-up');
        }, 1000);
        return;
    }
    // -----------------------

    try {
      const { customerInfo } = await Purchases.purchasePackage(selectedProduct);
      if (customerInfo.entitlements.active['Pro Access']) {
         router.push('/sign-up');
      }
    } catch (e: any) {
      if (!e.userCancelled) Alert.alert(t('common.error'), e.message);
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);

    // --- DEMO MODE BYPASS ---
    if (DEMO_MODE) {
        setTimeout(async () => {
            console.log("DEV: Mock Restore Successful");
            Alert.alert(t('common.success'), "Dev: Restore Successful");
            await finalizeOnboardingAndRedirect();
        }, 1000);
        return;
    }
    // -----------------------

    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active['Pro Access']) {
        Alert.alert(t('common.success'), t('paywall.restoreSuccess'));
        await finalizeOnboardingAndRedirect();
      } else {
        Alert.alert(t('common.info'), t('paywall.noPurchases'));
        setLoading(false);
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
      setLoading(false);
    }
  };

  // 4. Render
  if (!colors) return <View style={{flex:1}} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* HEADER */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <FontAwesome name="arrow-left" size={20} color={colors.subtext} />
          </Pressable>
          <Pressable onPress={handleRestore}>
            <Text style={[typography.caption, { color: colors.primary }]}>{t('paywall.restore', 'Restore')}</Text>
          </Pressable>
        </View>

        {/* HERO */}
        <View style={styles.heroSection}>
          <Text style={[typography.h1, { color: colors.text, textAlign: 'center', marginBottom: 8 }]}>
            {t('paywall.startFreeTrial', 'Start Your 7-Day Free Trial')}
          </Text>
          <Text style={[typography.body, { color: colors.subtext, textAlign: 'center' }]}>
            {t('paywall.trialSubtitle', 'Full access to all features. Cancel anytime.')}
          </Text>
        </View>

        {/* TOGGLE (Individual vs Company) */}
        <View style={styles.section}>
          <View style={[styles.toggleContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable 
              style={[
                styles.toggleBtn, 
                planType === 'individual' && { backgroundColor: colors.selector }
              ]}
              onPress={() => setPlanType('individual')}
            >
              <Text style={[typography.button, { color: colors.text }]}>{t('paywall.individual')}</Text>
            </Pressable>
            <Pressable 
              style={[
                styles.toggleBtn, 
                planType === 'company' && { backgroundColor: colors.selector }
              ]}
              onPress={() => setPlanType('company')}
            >
              <Text style={[typography.button, { color: colors.text }]}>{t('paywall.company')}</Text>
            </Pressable>
          </View>
        </View>


        {/* PLAN CARDS */}
        <View style={styles.section}>
          <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>
            {t('paywall.selectPlan', 'Select Plan')}
          </Text>

          {planType === 'individual' ? (
            <View style={styles.planRow}>
              {/* Monthly */}
              <Pressable
                style={[
                  styles.planCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: billingCycle === 'monthly' ? colors.primary : colors.border
                  },
                  billingCycle === 'monthly' && { borderWidth: 2 }
                ]}
                onPress={() => setBillingCycle('monthly')}
              >
                <Text style={[typography.h3, { color: colors.text, fontSize: 16 }]}>{t('paywall.monthly')}</Text>
                <Text style={[typography.h3, { color: colors.primary, marginTop: 8 }]}>
                  {billingCycle === 'monthly' ? displayPrice : '...'}
                </Text>
                <Text style={[typography.caption, { color: colors.subtext }]}>/ {t('paywall.mo')}</Text>
              </Pressable>

              {/* Yearly */}
              <Pressable
                style={[
                  styles.planCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: billingCycle === 'yearly' ? colors.primary : colors.border
                  },
                  billingCycle === 'yearly' && { borderWidth: 2 }
                ]}
                onPress={() => setBillingCycle('yearly')}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={[typography.h3, { color: colors.text, fontSize: 16 }]}>{t('paywall.yearly')}</Text>
                  <View style={[styles.badge, { backgroundColor: colors.success || '#4CAF50' }]}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>BEST</Text>
                  </View>
                </View>
                <Text style={[typography.h3, { color: colors.primary, marginTop: 8 }]}>
                  {billingCycle === 'yearly' ? displayPrice : '...'}
                </Text>
                <Text style={[typography.caption, { color: colors.subtext }]}>/ {t('paywall.yr')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.planRow}>
              {/* Team Size Dropdown */}
              <View style={[styles.dropdownCard, { backgroundColor: `${colors.card}CC`, borderColor: colors.border }]}>
                <Text style={[typography.caption, { color: colors.subtext, marginBottom: 4 }]}>
                  {t('paywall.teamSize', 'Team Size')}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {[5, 10, 20, 50, 100].map((count) => (
                    <Pressable
                      key={count}
                      onPress={() => setUserCount(count as UserCount)}
                      style={[
                        styles.dropdownOption,
                        {
                          backgroundColor: userCount === count ? colors.primary : `${colors.selector}80`,
                          borderColor: userCount === count ? colors.primary : colors.border
                        }
                      ]}
                    >
                      <Text style={[
                        typography.caption,
                        { color: userCount === count ? '#fff' : colors.text, fontWeight: '600' }
                      ]}>
                        {count}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Yearly Plan */}
              <Pressable
                style={[
                  styles.planCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.primary,
                    borderWidth: 2
                  }
                ]}
              >
                <Text style={[typography.h3, { color: colors.text, fontSize: 16 }]}>{t('paywall.yearly')}</Text>
                <Text style={[typography.h3, { color: colors.primary, marginTop: 8 }]}>
                  {displayPrice}
                </Text>
                <Text style={[typography.caption, { color: colors.subtext }]}>/ {t('paywall.yr')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* FEATURES LIST */}
        <View style={styles.section}>
           <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>
            {t('paywall.included', 'What is included')}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 8 }]}>
            <FeatureRow text={t('paywall.f1', 'Unlimited Warehouses')} colors={colors} />
            <FeatureRow text={t('paywall.f2', 'Barcode Scanning')} colors={colors} />
            <FeatureRow text={t('paywall.f3', 'Export to CSV/PDF')} colors={colors} />
            {planType === 'company' && (
               <FeatureRow text={t('paywall.f4', 'Team Roles & Admin Controls')} colors={colors} />
            )}
          </View>
        </View>

        <Text style={[typography.caption, { textAlign: 'center', color: colors.subtext, marginVertical: 20 }]}>
          {t('paywall.terms', 'Subscription automatically renews unless turned off 24h before end of period.')}
        </Text>

      </ScrollView>

      {/* FOOTER ACTION */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Pressable
          style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          onPress={handlePurchase}
          disabled={loading}
        >
           {loading ? <ActivityIndicator color="#fff" /> : (
             <>
               <Text style={[typography.button, { color: '#fff', fontSize: 18 }]}>
                 {t('paywall.startTrialAndCreateAccount', 'Start Trial & Create Account')}
               </Text>
               <Text style={[typography.caption, { color: '#fff', marginTop: 4, opacity: 0.9 }]}>
                 {t('paywall.freeFor7Days', 'Free for 7 days, then {{price}}', { price: displayPrice })}
               </Text>
             </>
           )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// Helper Component
function FeatureRow({ text, colors }: { text: string, colors: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0 }}>
      <FontAwesome name="check" size={14} color={colors.primary} style={{ marginRight: 12 }} />
      <Text style={[typography.body, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 24, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  closeButton: { padding: 8, marginLeft: -8 },

  heroSection: { alignItems: 'center', marginBottom: 20 },

  section: { marginBottom: 24 },
  sectionTitle: { marginBottom: 8, fontSize: 13, textTransform: 'uppercase', opacity: 0.7 },

  // Toggle
  toggleContainer: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },

  // Plan Cards
  planRow: { flexDirection: 'row', gap: 10 },
  planCard: { flex: 1, borderRadius: 12, padding: 16, borderWidth: 1 },

  // Dropdown for Company Team Size
  dropdownCard: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1 },
  dropdownOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },

  // Cards
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1 },
  ctaButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' }
});