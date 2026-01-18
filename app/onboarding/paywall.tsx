import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Platform, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { ChevronDown } from 'lucide-react-native';

import { useTheme } from '../../providers/ThemeProvider';
import { useOnboarding } from '../../providers/OnboardingProvider';
import { typography } from '../../styles/typography';
import { useSubscription } from '../../hooks/useSubscription';

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
  const { buySubscription, startTrial } = useSubscription();

  const isTrialExpired = params.expired === 'true';

  const [loading, setLoading] = useState(false);
  const [planType, setPlanType] = useState<PlanType>('individual');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [userCount, setUserCount] = useState<UserCount>(5);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // --- LEGAL MODAL STATE ---
  const [activeLegalDoc, setActiveLegalDoc] = useState<'terms' | 'privacy' | null>(null);

  // --- HELPER COMPONENT FOR LEGAL TEXT ---
  // Matches the one in SettingsScreen.tsx
  const LegalSection = ({ title, body }: { title: string, body: string }) => (
    <View style={{ marginBottom: 24 }}>
      <Text style={[typography.h3, { color: colors.text, marginBottom: 8, fontSize: 16 }]}>
        {title}
      </Text>
      <Text style={[typography.body, { color: colors.subtext, lineHeight: 22, fontSize: 14 }]}>
        {body}
      </Text>
    </View>
  );

  // ... Keep useEffect setupPurchases same as before ...
  useEffect(() => {
    const setupPurchases = async () => {
      if (DEMO_MODE) {
        // Updated Demo Prices and Currency (EURO)
        const companyPrices: Record<number, number> = { 5: 300, 10: 600, 20: 1150, 50: 2900, 100: 5700 };
        
        setPackages([
            { identifier: '$rc_monthly', packageType: 'MONTHLY', product: { identifier: 'monthly_pro', priceString: '€6.95', price: 6.95, title: 'Monthly', description: '', currencyCode: 'EUR' }, offeringIdentifier: 'default' } as any,
            { identifier: '$rc_annual', packageType: 'ANNUAL', product: { identifier: 'yearly_pro', priceString: '€69.95', price: 69.95, title: 'Yearly', description: '', currencyCode: 'EUR' }, offeringIdentifier: 'default' } as any,
            ...[5, 10, 20, 50, 100].map(count => ({
                identifier: `company_${count}_yearly`,
                packageType: 'CUSTOM',
                product: { 
                    identifier: `company_${count}_yearly`, 
                    priceString: `€${companyPrices[count as keyof typeof companyPrices]}`, 
                    price: companyPrices[count as keyof typeof companyPrices], 
                    title: `${count} Users`, 
                    description: '', 
                    currencyCode: 'EUR' 
                },
                offeringIdentifier: 'default'
            } as any))
        ]);
        return;
      }
      // ... RevenueCat setup ...
      try {
        if (Platform.OS === 'ios') {
            await Purchases.configure({ apiKey: API_KEYS.apple });
        } else if (Platform.OS === 'android') {
            await Purchases.configure({ apiKey: API_KEYS.google });
        }
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length !== 0) {
            setPackages(offerings.current.availablePackages);
        }
      } catch (e) {
        console.log("Error fetching offerings", e);
      }
    };
    setupPurchases();
  }, []);

  // Helpers to get specific package details for UI display
  const monthlyPackage = useMemo(() => 
    packages.find(p => p.packageType === 'MONTHLY' || p.identifier === '$rc_monthly'), 
  [packages]);

  const yearlyPackage = useMemo(() => 
    packages.find(p => p.packageType === 'ANNUAL' || p.identifier === '$rc_annual'), 
  [packages]);

  // Determine the actual product selected for purchase
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

  // Display strings
  const monthlyPriceDisplay = monthlyPackage?.product.priceString || '...';
  const yearlyPriceDisplay = yearlyPackage?.product.priceString || '...';
  const displayPrice = selectedProduct ? selectedProduct.product.priceString : '...';

  // --- ACTIONS ---

  const handleStartTrial = async () => {
    setLoading(true);
    
    // 1. Set the flag for AuthProvider to pick up later (Crucial for account creation flow)
    await AsyncStorage.setItem('PENDING_TRIAL_START', 'true');
    
    // 2. Also start local trial (optional but good backup)
    await startTrial();
    
    // 3. Complete onboarding
    await completeOnboarding();
    
    setLoading(false);
    
    // 4. Navigate to login
    router.push('/login');
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
    // ... RevenueCat purchase logic ...
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

        {/* TOGGLE */}
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

        {/* PLANS */}
        <View style={styles.section}>
          <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>
            {t('paywall.selectPlan', 'Select Plan')}
          </Text>

          {planType === 'individual' ? (
            <View style={styles.planRow}>
              <Pressable
                style={[
                  styles.planCard,
                  { backgroundColor: colors.card, borderColor: billingCycle === 'monthly' ? colors.primary : colors.border },
                  billingCycle === 'monthly' && { borderWidth: 2 }
                ]}
                onPress={() => setBillingCycle('monthly')}
              >
                <Text style={[typography.h3, { color: colors.text, fontSize: 13, fontWeight: '600' }]}>{t('paywall.mo')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                  <Text style={[typography.h3, { color: colors.primary }]}>{monthlyPriceDisplay}</Text>
                  <Text style={[typography.caption, { color: colors.subtext, fontSize: 11 }]}>/ {t('paywall.mo')}</Text>
                </View>
              </Pressable>

              <Pressable
                style={[
                  styles.planCard,
                  { backgroundColor: colors.card, borderColor: billingCycle === 'yearly' ? colors.primary : colors.border },
                  billingCycle === 'yearly' && { borderWidth: 2 }
                ]}
                onPress={() => setBillingCycle('yearly')}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={[typography.h3, { color: colors.text, fontSize: 13, fontWeight: '600' }]}>{t('paywall.yr')}</Text>
                  <View style={[styles.badge, { backgroundColor: colors.success || '#4CAF50' }]}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>BEST</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                  <Text style={[typography.h3, { color: colors.primary }]}>{yearlyPriceDisplay}</Text>
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

        {/* FEATURES */}
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

        {/* --- NEW LEGAL LINKS --- */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginTop: 10, marginBottom: 20 }}>
          <Pressable onPress={() => setActiveLegalDoc('terms')} style={{ padding: 10 }}>
            <Text style={[typography.caption, { color: colors.subtext, textDecorationLine: 'underline' }]}>
              {t('legal.terms', 'Terms & Conditions')}
            </Text>
          </Pressable>
          
          <Pressable onPress={() => setActiveLegalDoc('privacy')} style={{ padding: 10 }}>
             <Text style={[typography.caption, { color: colors.subtext, textDecorationLine: 'underline' }]}>
              {t('legal.privacy', 'Privacy Policy')}
            </Text>
          </Pressable>
        </View>

      </ScrollView>

      {/* TEAM SIZE DROPDOWN */}
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

      {/* --- NEW LEGAL MODAL (Consistent with SettingsScreen) --- */}
      <Modal
        visible={!!activeLegalDoc}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveLegalDoc(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '80%', width: '90%', backgroundColor: colors.card, borderColor: colors.border }]}>
            
            <Text style={[typography.h3, styles.modalTitle, { color: colors.text, marginBottom: 20 }]}>
               {activeLegalDoc === 'terms' ? t('legal.terms', 'Terms & Conditions') : t('legal.privacy', 'Privacy Policy')}
            </Text>

            <ScrollView style={{ width: '100%', marginBottom: 20 }} showsVerticalScrollIndicator={true}>
              
              {/* RENDER TERMS SECTIONS */}
              {activeLegalDoc === 'terms' && (
                <>
                  <LegalSection 
                    title={t('legal.terms.intro_title', '1. Introduction')} 
                    body={t('legal.terms.intro_body', 'Welcome to our application...')} 
                  />
                  <LegalSection 
                    title={t('legal.terms.usage_title', '2. Usage Rights')} 
                    body={t('legal.terms.usage_body', 'You agree to use this app only for...')} 
                  />
                  <LegalSection 
                    title={t('legal.terms.liability_title', '3. Limitation of Liability')} 
                    body={t('legal.terms.liability_body', 'We are not liable for any damages...')} 
                  />
                  <LegalSection 
                    title={t('legal.terms.liability_title', '3. Limitation of Liability')} 
                    body={t('legal.terms.liability_body', 'We are not liable for any damages...')} 
                  />
                  <LegalSection 
                    title={t('legal.terms.liability_title', '3. Limitation of Liability')} 
                    body={t('legal.terms.liability_body', 'We are not liable for any damages...')} 
                  />
                  <LegalSection 
                    title={t('legal.terms.liability_title', '3. Limitation of Liability')} 
                    body={t('legal.terms.liability_body', 'We are not liable for any damages...')} 
                  />
                  <LegalSection 
                    title={t('legal.terms.liability_title', '3. Limitation of Liability')} 
                    body={t('legal.terms.liability_body', 'We are not liable for any damages...')} 
                  />
                  <LegalSection 
                    title={t('legal.terms.liability_title', '3. Limitation of Liability')} 
                    body={t('legal.terms.liability_body', 'We are not liable for any damages...')} 
                  />
                </>
              )}

              {/* RENDER PRIVACY SECTIONS */}
              {activeLegalDoc === 'privacy' && (
                <>
                  <LegalSection 
                    title={t('legal.privacy.data_title', '1. Data Collection')} 
                    body={t('legal.privacy.data_body', 'We collect basic profile information...')} 
                  />
                  <LegalSection 
                    title={t('legal.privacy.usage_title', '2. How we use data')} 
                    body={t('legal.privacy.usage_body', 'Your data is used solely for inventory management...')} 
                  />
                  <LegalSection 
                    title={t('legal.privacy.security_title', '3. Data Security')} 
                    body={t('legal.privacy.security_body', 'We implement standard security measures...')} 
                  />
                </>
              )}

            </ScrollView>

            <Pressable 
              style={[styles.modalBtn, { backgroundColor: colors.selector, borderWidth: 0, marginTop: 10 }]} 
              onPress={() => setActiveLegalDoc(null)}
            >
              <Text style={[typography.button, { color: '#fff' }]}>{t('general.close', 'Close')}</Text>
            </Pressable>
            
          </View>
        </View>
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

// FeatureRow helper
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
  card: { borderRadius: 12, padding: 12, borderWidth: 1 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  ctaButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  
  // --- MODAL STYLES (Added for Legal Text) ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownModal: { width: '80%', borderRadius: 12, padding: 20, borderWidth: 1 }, // Used for Team Size
  dropdownModalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  
  // New specific styles for the Legal Modal to match SettingsScreen
  modalContent: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  modalBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
});