import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { typography } from '../styles/typography';

const { width } = Dimensions.get('window');

type PlanType = 'personal' | 'company';
type Interval = 'month' | 'year';

const COMPANY_TIERS = [
  { users: 1, price: 299 },
  { users: 5, price: 499 },
  { users: 10, price: 899 },
  { users: 25, price: 1999 },
  { users: 50, price: 1999 },
];

export default function PaywallScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const [planType, setPlanType] = useState<PlanType>('personal');
  const [personalInterval, setPersonalInterval] = useState<Interval>('year');
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);

  // --- Logic: Display Price ---
  const getPriceDisplay = () => {
    if (planType === 'personal') {
      return personalInterval === 'year' ? '$49.99/yr' : '$4.99/mo';
    }
    return `$${COMPANY_TIERS[selectedTierIndex].price}/yr`;
  };

  const handleStartTrial = () => {
    // Navigate to the actual Sign Up form only AFTER they click this
    // We pass the selected plan as params so you can save it later if needed
    router.push({
      pathname: '/sign-up',
      params: { 
        plan: planType, 
        tier: planType === 'company' ? COMPANY_TIERS[selectedTierIndex].users : 1,
        interval: planType === 'personal' ? personalInterval : 'year'
      }
    });
  };

  const BenefitItem = ({ text }: { text: string }) => (
    <View style={styles.benefitRow}>
      <View style={[styles.checkContainer, { backgroundColor: colors.primaryMuted }]}>
        <Feather name="check" size={16} color={colors.primary} />
      </View>
      <Text style={[typography.body, styles.benefitText, { color: colors.text }]}>{text}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryMuted }]}>
             <Feather name="package" size={40} color={colors.primary} />
          </View>
          <Text style={[typography.h1, styles.title, { color: colors.text }]}>{t('paywall.title', 'Unlock Warehouse Pro')}</Text>
          <Text style={[typography.body, styles.subtitle, { color: colors.subtext }]}>
            {t('paywall.subtitle', 'Streamline your inventory with professional tools.')}
          </Text>
        </View>

        {/* Value Props */}
        <View style={[styles.benefitsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <BenefitItem text={t('paywall.benefit1', 'Unlimited Items & Locations')} />
          <BenefitItem text={t('paywall.benefit2', 'Cloud Sync & Team Access')} />
          <BenefitItem text={t('paywall.benefit3', 'Advanced Reporting & History')} />
        </View>

        {/* Toggles: Personal vs Company */}
        <View style={[styles.toggleContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable 
            style={[styles.toggleButton, planType === 'personal' && { backgroundColor: colors.primary }]}
            onPress={() => setPlanType('personal')}
          >
            <Text style={[typography.button, { color: planType === 'personal' ? colors.primaryText : colors.subtext }]}>
              {t('paywall.personal', 'Personal Use')}
            </Text>
          </Pressable>
          <Pressable 
            style={[styles.toggleButton, planType === 'company' && { backgroundColor: colors.primary }]}
            onPress={() => setPlanType('company')}
          >
            <Text style={[typography.button, { color: planType === 'company' ? colors.primaryText : colors.subtext }]}>
              {t('paywall.company', 'Company Plan')}
            </Text>
          </Pressable>
        </View>

        {/* Pricing Cards */}
        {planType === 'personal' ? (
          <View style={styles.optionsContainer}>
            {/* Monthly */}
            <Pressable 
              style={[styles.optionCard, { backgroundColor: colors.card, borderColor: personalInterval === 'month' ? colors.primary : colors.border }]}
              onPress={() => setPersonalInterval('month')}
            >
              <FontAwesome name={personalInterval === 'month' ? "dot-circle-o" : "circle-o"} size={20} color={personalInterval === 'month' ? colors.primary : colors.subtext} />
              <View style={styles.optionContent}>
                <Text style={[typography.h3, { color: colors.text }]}>{t('paywall.monthly', 'Monthly')}</Text>
                <Text style={[typography.caption, { color: colors.subtext }]}>$4.99/mo</Text>
              </View>
            </Pressable>

            {/* Yearly */}
            <Pressable 
              style={[styles.optionCard, { backgroundColor: colors.card, borderColor: personalInterval === 'year' ? colors.primary : colors.border }]}
              onPress={() => setPersonalInterval('year')}
            >
              <FontAwesome name={personalInterval === 'year' ? "dot-circle-o" : "circle-o"} size={20} color={personalInterval === 'year' ? colors.primary : colors.subtext} />
              <View style={styles.optionContent}>
                <Text style={[typography.h3, { color: colors.text }]}>{t('paywall.yearly', 'Yearly')}</Text>
                <Text style={[typography.caption, { color: colors.subtext }]}>$49.99/yr</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.success }]}>
                <Text style={styles.badgeText}>{t('paywall.savePercent', 'SAVE 20%')}</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={styles.optionsContainer}>
            <Text style={[typography.body, styles.tierLabel, { color: colors.text }]}>Select Company Size:</Text>
            <View style={styles.tierGrid}>
              {COMPANY_TIERS.map((tier, index) => (
                <Pressable
                  key={tier.users}
                  style={[
                    styles.tierCard,
                    { 
                      backgroundColor: colors.card, 
                      borderColor: selectedTierIndex === index ? colors.primary : colors.border,
                      borderWidth: selectedTierIndex === index ? 2 : 1
                    }
                  ]}
                  onPress={() => setSelectedTierIndex(index)}
                >
                  <Text style={[typography.h2, { color: colors.text }]}>{tier.users}</Text>
                  <Text style={[typography.caption, { color: colors.subtext }]}>Users</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[typography.caption, styles.tierSummary, { color: colors.text }]}>
               {COMPANY_TIERS[selectedTierIndex].users} User License includes {COMPANY_TIERS[selectedTierIndex].users} access codes.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer / CTA */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.trialInfo}>
             <Text style={[typography.caption, { color: colors.text, textAlign: 'center' }]}>
               {t('paywall.trialNote', `First 14 days free, then ${getPriceDisplay()}`)}
             </Text>
        </View>
        
        <Pressable style={[styles.ctaButton, { backgroundColor: colors.primary }]} onPress={handleStartTrial}>
          <Text style={[typography.button, styles.ctaText, { color: colors.primaryText }]}>
            {t('paywall.startTrial', 'Start 14-Day Free Trial')}
          </Text>
        </Pressable>
        
        <Text style={[typography.caption, styles.cancelText, { color: colors.subtext }]}>
          {t('paywall.cancelAnytime', 'Cancel anytime. No commitment.')}
        </Text>

        <Pressable onPress={() => router.push('/login')} style={{ marginTop: 10 }}>
             <Text style={[typography.caption, { color: colors.primary, textAlign: 'center' }]}>
               Already have an account? Log In
             </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 180 },
  header: { alignItems: 'center', marginBottom: 30, marginTop: 40 },
  iconContainer: { padding: 16, borderRadius: 50, marginBottom: 16 },
  title: { textAlign: 'center', marginBottom: 8 },
  subtitle: { textAlign: 'center', maxWidth: '80%' },
  benefitsContainer: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkContainer: { padding: 4, borderRadius: 50, marginRight: 12 },
  benefitText: { fontWeight: '500' },
  toggleContainer: { flexDirection: 'row', padding: 4, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
  toggleButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  optionsContainer: { gap: 12 },
  optionCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 2, position: 'relative' },
  optionContent: { flex: 1, marginLeft: 16 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, position: 'absolute', right: 16, top: 16 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  tierLabel: { marginBottom: 12, fontWeight: 'bold' },
  tierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tierCard: { width: '47%', padding: 20, alignItems: 'center', borderRadius: 12, borderWidth: 1 },
  tierSummary: { marginTop: 16, textAlign: 'center', fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  trialInfo: { marginBottom: 12 },
  ctaButton: { padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  ctaText: { fontSize: 18, fontWeight: 'bold' },
  cancelText: { textAlign: 'center' },
});