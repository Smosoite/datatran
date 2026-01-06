import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { typography } from '../../styles/typography';
import { FontAwesome } from '@expo/vector-icons';
import { useSubscription } from '../../hooks/useSubscription';
import { showSuccess, showError } from '../../lib/toast';

const { width } = Dimensions.get('window');

// --- DATA: Business Tiers ---
const BUSINESS_TIERS = [
    { count: 5, price: 399, savePercent: 20 },
    { count: 10, price: 749, savePercent: 25 },
    { count: 20, price: 1399, savePercent: 30 },
    { count: 50, price: 3299, savePercent: 35 },
    { count: 100, price: 5999, savePercent: 40 },
];

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { status, startTrial, buySubscription } = useSubscription();
  
  const [processing, setProcessing] = useState(false);
  
  // State for UI selection
  const [activeTab, setActiveTab] = useState<'personal' | 'business'>('personal');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedBusinessTier, setSelectedBusinessTier] = useState(BUSINESS_TIERS[0]);

  const isExpired = status === 'trial_expired';

  // Prevent back navigation if expired
  useEffect(() => {
    if (isExpired) {
       // Logic handled in _layout, visual only here
    }
  }, [status, isExpired]);

  const handleStartTrial = async () => {
    setProcessing(true);
    setTimeout(async () => {
      const success = await startTrial();
      setProcessing(false);
      if (success) {
        showSuccess(t('general.success'), t('paywall.trialStarted', "7-Day Free Trial Started!"));
        router.replace('/(tabs)');
      } else {
        showError(t('general.error'), t('paywall.trialError', "Could not start trial."));
      }
    }, 1500);
  };

  const handlePurchase = async () => {
    setProcessing(true);
    setTimeout(async () => {
      // In a real app, pass the specific product ID here
      const success = await buySubscription(); 
      setProcessing(false);
      
      if (success) {
        if (activeTab === 'business') {
            showSuccess(t('paywall.enterpriseActive', "Enterprise Activated!"), t('paywall.codesReceived', { count: selectedBusinessTier.count }));
        } else {
            showSuccess(t('paywall.proActive', "Pro Activated!"), t('paywall.welcomePremium', "Welcome to Premium."));
        }
        router.replace('/(tabs)');
      } else {
        showError(t('paywall.purchaseCancelled', "Purchase Cancelled"), t('paywall.noCharge', "No charge was made."));
      }
    }, 2000);
  };

  if (status === 'loading') {
    return <View style={[styles.center, {flex:1, backgroundColor: colors.background}]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      
      {/* --- HEADER --- */}
      <View style={styles.header}>
         <View style={[styles.iconBadge, { backgroundColor: colors.primary }]}>
           <FontAwesome name={activeTab === 'personal' ? "user" : "building"} size={32} color="#fff" />
         </View>
         <Text style={[typography.h1, styles.title, { color: colors.text }]}>
            {isExpired ? t('paywall.trialExpired', "Trial Expired") : t('paywall.upgradeTitle', "Upgrade Your Workflow")}
         </Text>
         <Text style={[typography.body, styles.subtitle, { color: colors.subtext }]}>
            {isExpired 
                ? t('paywall.expiredDesc', "To continue using the app, please select a plan.") 
                : t('paywall.upgradeDesc', "Choose the plan that fits your needs.")}
         </Text>
      </View>

      {/* --- TAB TOGGLE --- */}
      <View style={[styles.toggleContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
         <Pressable 
            style={[styles.toggleButton, activeTab === 'personal' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('personal')}
         >
            <Text style={[typography.button, { color: activeTab === 'personal' ? '#fff' : colors.subtext }]}>
                {t('paywall.personalPro', "Personal Pro")}
            </Text>
         </Pressable>
         <Pressable 
            style={[styles.toggleButton, activeTab === 'business' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('business')}
         >
            <Text style={[typography.button, { color: activeTab === 'business' ? '#fff' : colors.subtext }]}>
                {t('paywall.businessTeam', "Business Team")}
            </Text>
         </Pressable>
      </View>

      {/* --- CONTENT AREA --- */}
      {activeTab === 'personal' ? (
        // === PERSONAL VIEW ===
        <View>
            <View style={styles.featuresContainer}>
                <FeatureRow icon="database" text={t('paywall.featUnlimited', "Unlimited Inventory Items")} colors={colors} />
                <FeatureRow icon="cloud-download" text={t('paywall.featExport', "CSV Data Export")} colors={colors} />
                <FeatureRow icon="mobile" text={t('paywall.featDevices', "Use on multiple devices")} colors={colors} />
            </View>

            {/* Billing Cycle Toggle */}
            <View style={styles.billingToggle}>
                <Pressable onPress={() => setBillingCycle('monthly')} style={{flexDirection:'row', alignItems:'center'}}>
                    <FontAwesome name={billingCycle === 'monthly' ? "dot-circle-o" : "circle-o"} size={20} color={colors.primary} />
                    <Text style={{marginLeft: 8, color: colors.text, fontWeight:'600'}}>
                        {t('paywall.monthly', "Monthly")}
                    </Text>
                </Pressable>
                <Pressable onPress={() => setBillingCycle('yearly')} style={{flexDirection:'row', alignItems:'center'}}>
                    <FontAwesome name={billingCycle === 'yearly' ? "dot-circle-o" : "circle-o"} size={20} color={colors.primary} />
                    <Text style={{marginLeft: 8, color: colors.text, fontWeight:'600'}}>
                        {t('paywall.yearly', "Yearly")}
                    </Text>
                    <View style={[styles.saveBadge, {backgroundColor: colors.success}]}>
                        <Text style={{color:'#fff', fontSize:10, fontWeight:'bold'}}>
                            {t('paywall.savePercent', "SAVE 20%")}
                        </Text>
                    </View>
                </Pressable>
            </View>

            {/* Personal Price Card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                <Text style={[typography.h3, { color: colors.text, marginBottom: 4 }]}>
                    {billingCycle === 'monthly' ? t('paywall.proMonthly', "Pro Monthly") : t('paywall.proAnnual', "Pro Annual")}
                </Text>
                <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                    <Text style={{ fontSize: 36, fontWeight: 'bold', color: colors.text }}>
                        {billingCycle === 'monthly' ? '$9.99' : '$99.99'}
                    </Text>
                    <Text style={{ fontSize: 16, color: colors.subtext, marginBottom: 6 }}>
                        {billingCycle === 'monthly' ? t('paywall.perMonth', " / month") : t('paywall.perYear', " / year")}
                    </Text>
                </View>
                <Text style={{ color: colors.subtext, marginTop: 8, fontSize: 13 }}>
                    {t('paywall.recurringCancel', "Recurring billing. Cancel anytime via App Store settings.")}
                </Text>
            </View>
        </View>

      ) : (
        // === BUSINESS VIEW ===
        <View>
            <View style={styles.featuresContainer}>
                <FeatureRow icon="users" text={t('paywall.featTeamAccess', "Full Pro Access for Team Members")} colors={colors} />
                <FeatureRow icon="key" text={t('paywall.featCodes', "Generates shareable license codes")} colors={colors} />
                <FeatureRow icon="shield" text={t('paywall.featAdmin', "Centralized Admin Control")} colors={colors} />
            </View>
            
            <Text style={[typography.h3, {color: colors.text, marginBottom: 12}]}>
                {t('paywall.selectTeamSize', "Select Team Size")}
            </Text>

            {/* Tier Selector */}
            <View style={{gap: 10, marginBottom: 20}}>
                {BUSINESS_TIERS.map((tier) => {
                    const isSelected = selectedBusinessTier.count === tier.count;
                    return (
                        <Pressable 
                            key={tier.count}
                            onPress={() => setSelectedBusinessTier(tier)}
                            style={[
                                styles.tierRow, 
                                { 
                                    backgroundColor: colors.card, 
                                    borderColor: isSelected ? colors.primary : colors.border,
                                    borderWidth: isSelected ? 2 : 1
                                }
                            ]}
                        >
                            <View style={{flexDirection:'row', alignItems:'center'}}>
                                <View style={[styles.radio, { borderColor: isSelected ? colors.primary : colors.subtext }]}>
                                    {isSelected && <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary}} />}
                                </View>
                                <Text style={[typography.body, {color: colors.text, fontWeight: '600', marginLeft: 10}]}>
                                    {t('paywall.userCount', { count: tier.count, defaultValue: `${tier.count} Users` })}
                                </Text>
                            </View>
                            <View style={{alignItems:'flex-end'}}>
                                <Text style={{fontWeight:'bold', color: colors.text, fontSize: 16}}>${tier.price}</Text>
                                <Text style={{color: colors.success, fontSize: 10, fontWeight:'bold'}}>
                                    {t('paywall.savePercentValue', { percent: tier.savePercent, defaultValue: `SAVE ${tier.savePercent}%` })}
                                </Text>
                            </View>
                        </Pressable>
                    )
                })}
            </View>
        </View>
      )}

      {/* --- FOOTER ACTIONS --- */}
      <View style={styles.footer}>
        
        {/* BUY BUTTON */}
        <Pressable 
            style={[styles.button, { backgroundColor: colors.primary, opacity: processing ? 0.7 : 1 }]}
            onPress={handlePurchase}
            disabled={processing}
        >
            {processing ? <ActivityIndicator color="#fff" /> : (
                <>
                    <Text style={[typography.button, { color: colors.primaryText, fontSize: 16 }]}>
                        {activeTab === 'personal' 
                            ? t('paywall.subscribePrice', { price: billingCycle === 'monthly' ? '$9.99' : '$99.99' })
                            : t('paywall.buyLicenses', { count: selectedBusinessTier.count, price: selectedBusinessTier.price })
                        }
                    </Text>
                    <FontAwesome name="lock" size={16} color={colors.primaryText} style={{marginLeft: 10}} />
                </>
            )}
        </Pressable>

        {/* TRIAL BUTTON (Only for Personal & Not Expired) */}
        {!isExpired && activeTab === 'personal' && (
            <Pressable 
                style={[styles.secondaryButton, { borderColor: colors.primary }]}
                onPress={handleStartTrial}
                disabled={processing}
            >
                <Text style={[typography.button, { color: colors.primary }]}>
                    {t('paywall.startTrial', "Start 7-Day Free Trial")}
                </Text>
            </Pressable>
        )}
        
        {/* Helper Text */}
        <Text style={{ textAlign: 'center', marginTop: 15, color: colors.subtext, fontSize: 12, paddingHorizontal: 20 }}>
            {activeTab === 'business' 
                ? t('paywall.businessDisclaimer', "Business licenses are billed annually. You will receive activation codes immediately after purchase to distribute to your team.")
                : t('paywall.personalDisclaimer', "Payment charged to iTunes/Play Store account at confirmation of purchase.")
            }
        </Text>

      </View>
    </ScrollView>
  );
}

const FeatureRow = ({ icon, text, colors }: any) => (
  <View style={styles.featureRow}>
    <View style={{width: 30, alignItems:'center', marginRight: 10}}>
        <FontAwesome name={icon} size={18} color={colors.primary} />
    </View>
    <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 50 },
  center: { justifyContent: 'center', alignItems: 'center' },
  
  header: { alignItems: 'center', marginBottom: 20, marginTop: 20 },
  iconBadge: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16, elevation: 5 },
  title: { textAlign: 'center', marginBottom: 8 },
  subtitle: { textAlign: 'center', opacity: 0.8, fontSize: 14, maxWidth: 280 },
  
  toggleContainer: { flexDirection: 'row', borderRadius: 12, padding: 4, borderWidth: 1, marginBottom: 24 },
  toggleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  
  featuresContainer: { marginBottom: 24, paddingHorizontal: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  
  billingToggle: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 10 },
  saveBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  
  card: { padding: 24, borderRadius: 16, borderWidth: 2, marginBottom: 20 },
  
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  
  footer: { gap: 12, marginTop: 10 },
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 12, elevation: 2 },
  secondaryButton: { justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 12, borderWidth: 1, backgroundColor: 'transparent' }
});