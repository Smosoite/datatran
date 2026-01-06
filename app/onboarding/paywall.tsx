import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Adjust these imports based on your actual folder structure
import { useTheme } from '../../providers/ThemeProvider'; 
import { useOnboarding } from '../../providers/OnboardingProvider'; 
import { typography } from '../../styles/typography'; 

const { width } = Dimensions.get('window');

type PlanType = 'individual' | 'company';
type BillingCycle = 'monthly' | 'yearly';
type UserCount = 5 | 10 | 20 | 50 | 100;

export default function PaywallScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { completeOnboarding } = useOnboarding();
  
  const [loading, setLoading] = useState(false);
  
  // State for toggles
  const [planType, setPlanType] = useState<PlanType>('individual');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [userCount, setUserCount] = useState<UserCount>(5);

  // --- Pricing Logic (Mock Data) ---
  const priceData = useMemo(() => {
    // Individual Prices
    if (planType === 'individual') {
      return {
        monthly: { price: '$9.99', sub: t('paywall.perMonth', '/mo') },
        yearly: { price: '$89.99', sub: t('paywall.perYear', '/yr'), savings: '25%' }
      };
    } 
    
    // Company Prices (Yearly Only)
    // Mock calculation: $80 per user per year (bulk discount applied)
    const basePerUser = 80;
    const total = basePerUser * userCount;
    return {
      yearly: { 
        price: `$${total}.00`, 
        sub: t('paywall.perYearForUsers', '/yr for {{count}} users', { count: userCount }),
        savings: '20%' // Bulk discount
      }
    };
  }, [planType, userCount, t]);

  const finalizeOnboardingAndRedirect = async () => {
    try {
      setLoading(true);
      await AsyncStorage.setItem('ONBOARDING_COMPLETED', 'true');
      
      if (completeOnboarding) {
        await completeOnboarding();
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      router.replace('/(tabs)/home');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      setLoading(false);
      finalizeOnboardingAndRedirect();
    }, 1500);
  };

  const handleClose = async () => {
    await finalizeOnboardingAndRedirect();
  };

  return (
    <LinearGradient
      // Using the same gradient colors as CompletionScreen
      colors={[colors.primary, colors.selector]} 
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleClose} style={styles.iconButton}>
              <FontAwesome name="times" size={20} color="rgba(255,255,255,0.8)" />
            </Pressable>
            <Pressable onPress={() => {}}>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.8)' }]}>
                {t('paywall.restore', 'Restore')}
              </Text>
            </Pressable>
          </View>

          {/* Hero Section */}
          <View style={styles.heroContainer}>
            <View style={styles.iconCircle}>
              <FontAwesome name="diamond" size={50} color="white" />
            </View>
            <Text style={[typography.h1, styles.title]}>
              {t('paywall.unlockPro', 'Unlock Pro Access')}
            </Text>
            <Text style={[typography.body, styles.subtitle]}>
              {planType === 'individual' 
                ? t('paywall.subtitleInd', 'Manage your inventory without limits.')
                : t('paywall.subtitleComp', 'Empower your entire team with collaborative tools.')
              }
            </Text>
          </View>

          {/* Type Toggle (Individual vs Company) */}
          <View style={styles.toggleContainer}>
            <Pressable 
              style={[styles.toggleButton, planType === 'individual' && styles.toggleActive]}
              onPress={() => setPlanType('individual')}
            >
              <Text style={[styles.toggleText, planType === 'individual' && styles.toggleTextActive]}>
                {t('paywall.individual', 'Individual')}
              </Text>
            </Pressable>
            <Pressable 
              style={[styles.toggleButton, planType === 'company' && styles.toggleActive]}
              onPress={() => setPlanType('company')}
            >
              <Text style={[styles.toggleText, planType === 'company' && styles.toggleTextActive]}>
                {t('paywall.company', 'Company')}
              </Text>
            </Pressable>
          </View>

          {/* --- COMPANY: User Count Selector --- */}
          {planType === 'company' && (
            <View style={styles.userSelectorContainer}>
              <Text style={styles.sectionLabel}>{t('paywall.selectSeats', 'Select Team Size:')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.userList}>
                {[5, 10, 20, 50, 100].map((count) => (
                  <Pressable
                    key={count}
                    style={[styles.userOption, userCount === count && styles.userOptionActive]}
                    onPress={() => setUserCount(count as UserCount)}
                  >
                    <Text style={[styles.userOptionText, userCount === count && styles.userOptionTextActive]}>
                      {count}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Pricing Cards */}
          <View style={styles.plansContainer}>
            {/* If Individual: Show Monthly Option */}
            {planType === 'individual' && (
              <PlanCard 
                title={t('paywall.monthly', 'Monthly')}
                price={priceData.monthly!.price}
                subtitle={priceData.monthly!.sub}
                isSelected={billingCycle === 'monthly'}
                onPress={() => setBillingCycle('monthly')}
              />
            )}

            {/* Show Yearly Option (Always visible for both, enforced for Company) */}
            <PlanCard 
              title={t('paywall.yearly', 'Yearly')}
              price={priceData.yearly.price}
              subtitle={priceData.yearly.sub}
              badge={t('paywall.bestValue', 'BEST VALUE')}
              isSelected={billingCycle === 'yearly'}
              onPress={() => setBillingCycle('yearly')}
              isCompany={planType === 'company'} // Visual hint that it's the only option
            />
          </View>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            <FeatureItem text={t('paywall.feat1', 'Unlimited Warehouses & Items')} />
            <FeatureItem text={t('paywall.feat2', 'Advanced Barcode Scanning')} />
            {planType === 'company' && (
              <>
                 <FeatureItem text={t('paywall.featTeam1', 'Admin & Staff Roles')} />
                 <FeatureItem text={t('paywall.featTeam2', 'Activity Logs & Audits')} />
              </>
            )}
            <FeatureItem text={t('paywall.feat3', 'Priority Support')} />
          </View>

          <Text style={styles.termsText}>
            {t('paywall.terms', 'Recurring billing. Cancel anytime.')}
          </Text>

        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable 
            style={styles.subscribeButton}
            onPress={handlePurchase}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[typography.button, styles.subscribeText, { color: colors.primary }]}>
                  {planType === 'individual' && billingCycle === 'monthly'
                    ? t('paywall.subMonthly', 'Subscribe Monthly')
                    : t('paywall.startTrial', 'Start 7-Day Free Trial')
                  }
                </Text>
                <FontAwesome name="arrow-right" size={16} color={colors.primary} style={{ marginLeft: 8 }} />
              </View>
            )}
          </Pressable>
          <Text style={styles.footerNote}>
            {t('paywall.noCommitment', 'No commitment. Cancel in settings.')}
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// --- Subcomponents ---

function PlanCard({ title, price, subtitle, badge, isSelected, onPress, isCompany }: any) {
  return (
    <Pressable 
      style={[
        styles.planCard, 
        isSelected && styles.planCardSelected,
        isCompany && { opacity: 1 } // Ensure company card looks active
      ]}
      onPress={onPress}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={styles.planTitle}>{title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={styles.planPrice}>{price}</Text>
            <Text style={styles.planSubtitle}>{subtitle}</Text>
          </View>
        </View>
        {isSelected ? (
           <FontAwesome name="check-circle" size={24} color="white" />
        ) : (
           <View style={styles.radioCircle} />
        )}
      </View>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureItem}>
      <FontAwesome name="check" size={14} color="rgba(255,255,255,0.9)" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 120 },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconButton: {
    padding: 8,
    marginLeft: -8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  
  heroContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Toggle Styles
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 30,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: 'white',
  },
  toggleText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#333', // Dark text on white toggle
    fontWeight: 'bold',
  },

  // User Selector
  userSelectorContainer: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
    fontWeight: '600',
  },
  userList: {
    gap: 12,
  },
  userOption: {
    width: 50, height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  userOptionActive: {
    backgroundColor: 'white',
    borderColor: 'white',
  },
  userOptionText: {
    color: 'white',
    fontWeight: 'bold',
  },
  userOptionTextActive: {
    color: '#333',
  },

  // Plans
  plansContainer: { gap: 16, marginBottom: 32 },
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  planCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'white',
    borderWidth: 2,
  },
  planTitle: {
    color: 'white', fontWeight: 'bold', fontSize: 16, marginBottom: 4
  },
  planPrice: {
    color: 'white', fontWeight: 'bold', fontSize: 24, marginRight: 8
  },
  planSubtitle: {
    color: 'rgba(255,255,255,0.7)', fontSize: 14
  },
  radioCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)'
  },
  badge: {
    position: 'absolute', top: -10, right: 16,
    backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4
  },
  badgeText: {
    color: 'black', fontSize: 10, fontWeight: 'bold'
  },

  // Features
  featuresContainer: { gap: 12, marginBottom: 24, paddingHorizontal: 8 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { color: 'rgba(255,255,255,0.9)', fontSize: 15 },
  
  termsText: {
    color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 12, marginBottom: 20
  },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 24, alignItems: 'center',
  },
  subscribeButton: {
    backgroundColor: 'white',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  subscribeText: {
    fontWeight: 'bold', fontSize: 16
  },
  footerNote: {
    color: 'rgba(255,255,255,0.6)', fontSize: 12
  },
});