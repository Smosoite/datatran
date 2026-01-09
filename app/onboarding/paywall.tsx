import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { ChevronDown } from 'lucide-react-native';

// Contexts & Styles
import { useTheme } from '../../providers/ThemeProvider';
import { useOnboarding } from '../../providers/OnboardingProvider';
import { typography } from '../../styles/typography';
import { useSubscription } from '../../hooks/useSubscription';

// --- CONFIGURATION ---
const API_KEYS = {
  apple: "appl_your_api_key_here",
  google: "goog_your_api_key_here"
};

const DEMO_MODE = true;

type PlanType = 'individual' | 'company';
type BillingCycle = 'monthly' | 'yearly';
type UserCount = 5 | 10 | 20 | 50 | 100;

export default function PaywallScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { completeOnboarding } = useOnboarding();
  const { buySubscription } = useSubscription();

  const isTrialExpired = params.expired === 'true';

  const [loading, setLoading] = useState(false);
  const [planType, setPlanType] = useState<PlanType>('individual');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [userCount, setUserCount] = useState<UserCount>(5);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // 1. Initialize RevenueCat (or Mock Data)
  useEffect(() => {
    const setupPurchases = async () => {
      if (DEMO_MODE) {
        console.log("DEV: Loading Mock Packages");
        setPackages([
            { identifier: '$rc_monthly', packageType: 'MONTHLY', product: { identifier: 'monthly_pro', priceString: '$9.99', price: 9.99, title: 'Monthly', description: '', currencyCode: 'USD' }, offeringIdentifier: 'default' } as any,
            { identifier: '$rc_annual', packageType: 'ANNUAL', product: { identifier: 'yearly_pro', priceString: '$99.99', price: 99.99, title: 'Yearly', description: '', currencyCode: 'USD' }, offeringIdentifier: 'default' } as any,
            ...[5, 10, 20, 50, 100].map(count => ({
                identifier: `company_${count}_yearly`,
                packageType: 'CUSTOM',
                product: { identifier: `company_${count}_yearly`, priceString: `$${count * 100}.00`, price: count * 100, title: `${count} Users`, description: '', currencyCode: 'USD' },
                offeringIdentifier: 'default'
            } as any))
        ]);
        return;
      }

      try {
        if (Platform.OS === 'ios') await Purchases.configure({ apiKey: API_KEYS.apple });
        else if (Platform.OS === 'android') await Purchases.configure({ apiKey: API_KEYS.google });
        
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
  const handleStartTrial = async () => {
    setLoading(true);
    await completeOnboarding();
    setLoading(false);
    router.push('/login?start_trial=true');
  };

  const handleBuySubscription = async () => {
    setLoading(true);

    if (DEMO_MODE) {
      setTimeout(async () => {
        await buySubscription();
        Alert.alert(t('common.success'), "Subscription activated!");
        router.replace('/(tabs)');
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      if (!selectedProduct) {
        Alert.alert(t('common.error'), 'Please select a plan');
        setLoading(false);
        return;
      }

      const { customerInfo } = await Purchases.purchasePackage(selectedProduct);

      if (customerInfo.entitlements.active['Pro Access']) {
        await buySubscription();
        Alert.alert(t('common.success'), t('paywall.purchaseSuccess'));
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      if (e.userCancelled) {
        Alert.alert(t('common.info'), t('paywall.purchaseCancelled'));
      } else {
        Alert.alert(t('common.error'), e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    if (DEMO_MODE) {
        setTimeout(async () => {
            await buySubscription();
            Alert.alert(t('common.success'), "Dev: Restore Successful");
            router.replace('/(tabs)');
            setLoading(false);
        }, 1000);
        return;
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active['Pro Access']) {
        await buySubscription();
        Alert.alert(t('common.success'), t('paywall.restoreSuccess'));
        router.replace('/(tabs)');
      } else {
        Alert.alert(t('common.info'), t('paywall.noPurchases'));
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
        setLoading(false);
    }
  };

  if (!colors) return <View style={{flex:1}} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.headerRow}>
          {!isTrialExpired && (
            <Pressable onPress={() => router.back()} style={styles.closeButton}>
              <FontAwesome name="arrow-left" size={20} color={colors.subtext} />
            </Pressable>
          )}
          {isTrialExpired && <View style={styles.closeButton} />}
          <Pressable onPress={handleRestore}>
            <Text style={[typography.caption, { color: colors.primary }]}>{t('paywall.restore', 'Restore')}</Text>
          </Pressable>
        </View>

        {/* HERO */}
        <View style={styles.heroSection}>
          <Text style={[typography.h1, { color: colors.text, textAlign: 'center', marginBottom: 8 }]}>
            {isTrialExpired
              ? t('paywall.trialEnded', 'Your Trial Has Ended')
              : t('paywall.startFreeTrial', 'Start Your 7-Day Free Trial')
            }
          </Text>
          <Text style={[typography.body, { color: colors.subtext, textAlign: 'center' }]}>
            {isTrialExpired
              ? t('paywall.subscribeNow', 'Subscribe now to continue using all features')
              : t('paywall.trialSubtitle', 'Full access to all features. Cancel anytime.')
            }
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

        {/* PLAN CARDS - (Kept your existing structure) */}
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
                  { backgroundColor: colors.card, borderColor: billingCycle === 'monthly' ? colors.primary : colors.border },
                  billingCycle === 'monthly' && { borderWidth: 2 }
                ]}
                onPress={() => setBillingCycle('monthly')}
              >
                <Text style={[typography.h3, { color: colors.text, fontSize: 13, fontWeight: '600' }]}>MONTH</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                  <Text style={[typography.h3, { color: colors.primary }]}>{billingCycle === 'monthly' ? displayPrice : '...'}</Text>
                  <Text style={[typography.caption, { color: colors.subtext, fontSize: 11 }]}>/ {t('paywall.mo')}</Text>
                </View>
              </Pressable>

              {/* Yearly */}
              <Pressable
                style={[
                  styles.planCard,
                  { backgroundColor: colors.card, borderColor: billingCycle === 'yearly' ? colors.primary : colors.border },
                  billingCycle === 'yearly' && { borderWidth: 2 }
                ]}
                onPress={() => setBillingCycle('yearly')}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={[typography.h3, { color: colors.text, fontSize: 13, fontWeight: '600' }]}>YEAR</Text>
                  <View style={[styles.badge, { backgroundColor: colors.success || '#4CAF50' }]}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>BEST</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                  <Text style={[typography.h3, { color: colors.primary }]}>{billingCycle === 'yearly' ? displayPrice : '...'}</Text>
                  <Text style={[typography.caption, { color: colors.subtext, fontSize: 11 }]}>/ {t('paywall.yr')}</Text>
                </View>
              </Pressable>
            </View>
          ) : (
            <View style={styles.planRow}>
               <Pressable
                style={[styles.dropdownCard, { backgroundColor: `${colors.card}CC`, borderColor: colors.border, flex: 0.75 }]}
                onPress={() => setShowDropdown(true)}
              >
                <View style={styles.dropdownDisplay}>
                  <Text style={[typography.h3, { color: colors.text, fontSize: 32, fontWeight: '700' }]}>{userCount}</Text>
                  <ChevronDown size={20} color={colors.primary} />
                </View>
                <Text style={[typography.caption, { color: colors.subtext, fontSize: 10, marginTop: 4 }]}>{t('paywall.users', 'Users')}</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.planCard,
                  { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 2, flex: 1.25 }
                ]}
              >
                <Text style={[typography.h3, { color: colors.text, fontSize: 13, fontWeight: '600' }]}>{t('paywall.yr')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                  <Text style={[typography.h3, { color: colors.primary }]}>{displayPrice}</Text>
                  <Text style={[typography.caption, { color: colors.subtext, fontSize: 11 }]}>/ {t('paywall.yr')}</Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>

        {/* FEATURES LIST */}
        <View style={styles.section}>
           <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>
            {t('paywall.included', 'What is included')}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 4, paddingHorizontal: 8 }]}>
            <FeatureRow text={t('paywall.f0', 'Use on any mobile device')} colors={colors} />
            <FeatureRow text={t('paywall.f1', 'Unlimited Warehouses')} colors={colors} />
            <FeatureRow text={t('paywall.f2', 'Barcode Scanning')} colors={colors} />
            <FeatureRow text={t('paywall.f3', 'Export to CSV/PDF')} colors={colors} />
            {planType === 'company' && (
               <>
                 <FeatureRow text={t('paywall.f4', 'Team Roles & Admin Controls')} colors={colors} />
                 <FeatureRow text={t('paywall.f5', 'Purchase additional users at any time')} colors={colors} />
               </>
            )}
          </View>
        </View>

        <Text style={[typography.caption, { textAlign: 'center', color: colors.subtext, marginVertical: 12 }]}>
          {t('paywall.terms', 'Subscription automatically renews unless turned off 24h before end of period.')}
        </Text>

      </ScrollView>

      {/* TEAM SIZE DROPDOWN MODAL */}
      <Modal
        transparent
        visible={showDropdown}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDropdown(false)}
        >
          <View style={[styles.dropdownModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: 16 }]}>
              {t('paywall.teamSize', 'Team Size')}
            </Text>
            {[5, 10, 20, 50, 100].map((count) => (
              <Pressable
                key={count}
                style={[
                  styles.dropdownModalItem,
                  { borderBottomColor: colors.border },
                  userCount === count && { backgroundColor: `${colors.primary}15` }
                ]}
                onPress={() => {
                  setUserCount(count as UserCount);
                  setShowDropdown(false);
                }}
              >
                <Text
                  style={[
                    typography.body,
                    { color: userCount === count ? colors.primary : colors.text, fontWeight: userCount === count ? '600' : '400' }
                  ]}
                >
                  {count} {t('paywall.users', 'Users')}
                </Text>
                {userCount === count && (
                  <FontAwesome name="check" size={16} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* FOOTER ACTION */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          onPress={isTrialExpired ? handleBuySubscription : handleStartTrial}
          disabled={loading}
        >
           {loading ? <ActivityIndicator color="#fff" /> : (
             <>
               <Text style={[typography.button, { color: '#fff', fontSize: 18 }]}>
                 {isTrialExpired
                   ? t('paywall.buySubscription', 'Buy Subscription')
                   : t('paywall.startTrialAndLogin', 'Start Trial & Login')
                 }
               </Text>
               {!isTrialExpired && (
                 <Text style={[typography.caption, { color: '#fff', marginTop: 4, opacity: 0.9 }]}>
                   {t('paywall.freeFor7Days', 'Free for 7 days, then {{price}}', { price: displayPrice })}
                 </Text>
               )}
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
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 0 }}>
      <FontAwesome name="check" size={14} color={colors.primary} style={{ marginRight: 10 }} />
      <Text style={[typography.body, { color: colors.text, fontSize: 14 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 24, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  closeButton: { padding: 8, marginLeft: -8 },
  heroSection: { alignItems: 'center', marginBottom: 12 },
  section: { marginBottom: 16 },
  sectionTitle: { marginBottom: 6, fontSize: 13, textTransform: 'uppercase', opacity: 0.7 },
  toggleContainer: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  planRow: { flexDirection: 'row', gap: 10 },
  planCard: { flex: 1, borderRadius: 12, padding: 8, paddingVertical: 8, borderWidth: 1 },
  dropdownCard: { flex: 1, borderRadius: 12, padding: 8, paddingVertical: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dropdownDisplay: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownModal: { width: '80%', borderRadius: 12, padding: 20, borderWidth: 1 },
  dropdownModalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  card: { borderRadius: 12, padding: 12, borderWidth: 1 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  ctaButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }
});