import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../providers/ThemeProvider';
import { typography } from '../styles/typography';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSubscription } from '../hooks/useSubscription';
import { showSuccess, showError } from '../lib/toast';

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { status, hoursLeft, startTrial, buySubscription } = useSubscription();
  const [processing, setProcessing] = useState(false);

  // Prevent going back if trial is expired
  useEffect(() => {
    if (status === 'trial_expired') {
      // Logic to prevent gestures is handled in _layout.tsx options,
      // but we can ensure no 'back' button renders here.
    }
  }, [status]);

  const handleStartTrial = async () => {
    setProcessing(true);
    // Simulate network delay
    setTimeout(async () => {
      const success = await startTrial();
      setProcessing(false);
      if (success) {
        showSuccess(t('general.success'), "7-Day Free Trial Started!");
        router.replace('/(tabs)');
      } else {
        showError(t('general.error'), "Could not start trial.");
      }
    }, 1500);
  };

  const handlePurchase = async () => {
    setProcessing(true);
    // Simulate Store Kit / RevenueCat flow
    setTimeout(async () => {
      const success = await buySubscription(); // In real app, passes specific package
      setProcessing(false);
      if (success) {
        showSuccess(t('general.success'), "Premium Activated!");
        router.replace('/(tabs)');
      } else {
        showError("Purchase Cancelled", "No charge was made.");
      }
    }, 2000);
  };

  if (status === 'loading') {
    return <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
  }

  const isExpired = status === 'trial_expired';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: colors.primary }]}>
          <FontAwesome name="diamond" size={40} color="#fff" />
        </View>
        <Text style={[typography.h1, styles.title, { color: colors.text }]}>
          {isExpired ? "Trial Expired" : "Unlock Full Access"}
        </Text>
        <Text style={[typography.body, styles.subtitle, { color: colors.subtext }]}>
          {isExpired 
            ? "Your 7-day free trial has ended. Subscribe to continue using the app."
            : "Get unlimited items, advanced reporting, and team collaboration."}
        </Text>
      </View>

      {/* --- FEATURES --- */}
      <View style={styles.featuresContainer}>
        <FeatureRow icon="database" text="Unlimited Inventory Items" colors={colors} />
        <FeatureRow icon="users" text="Unlimited Team Members" colors={colors} />
        <FeatureRow icon="cloud-download" text="CSV Data Export" colors={colors} />
        <FeatureRow icon="shield" text="Admin Security Controls" colors={colors} />
      </View>

      {/* --- PRICING CARD --- */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: isExpired ? colors.danger : colors.primary }]}>
        {isExpired && (
            <View style={[styles.expiredBadge, { backgroundColor: colors.danger }]}>
                <Text style={styles.expiredText}>EXPIRED</Text>
            </View>
        )}
        <Text style={[typography.h3, { color: colors.text, marginBottom: 4 }]}>Pro Monthly</Text>
        <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.text }}>$9.99</Text>
            <Text style={{ fontSize: 16, color: colors.subtext, marginBottom: 6 }}> / month</Text>
        </View>
        <Text style={{ color: colors.subtext, marginTop: 8 }}>Cancel anytime. Secure payment via App Store/Google Play.</Text>
      </View>
      
      {/* --- ACTIONS --- */}
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
                        {isExpired ? "Subscribe Now" : "Subscribe ($9.99/mo)"}
                    </Text>
                    <FontAwesome name="lock" size={16} color={colors.primaryText} style={{marginLeft: 10}} />
                </>
            )}
        </Pressable>

        {/* TRIAL BUTTON (Only if NOT expired) */}
        {!isExpired && (
            <Pressable 
                style={[styles.secondaryButton, { borderColor: colors.primary }]}
                onPress={handleStartTrial}
                disabled={processing}
            >
                <Text style={[typography.button, { color: colors.primary }]}>Start 7-Day Free Trial</Text>
            </Pressable>
        )}

        {/* Status Text */}
        {!isExpired && hoursLeft > 0 && hoursLeft < 168 && (
            <Text style={{ textAlign: 'center', marginTop: 15, color: colors.info }}>
                Time Remaining: {Math.floor(hoursLeft / 24)}d {Math.floor(hoursLeft % 24)}h
            </Text>
        )}
      </View>
    </ScrollView>
  );
}

const FeatureRow = ({ icon, text, colors }: any) => (
  <View style={styles.featureRow}>
    <FontAwesome name="check-circle" size={18} color={colors.success} style={{ marginRight: 12 }} />
    <Text style={[typography.body, { color: colors.text }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 50 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 30, marginTop: 40 },
  iconBadge: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5 },
  title: { textAlign: 'center', marginBottom: 10 },
  subtitle: { textAlign: 'center', lineHeight: 22, opacity: 0.8 },
  featuresContainer: { marginBottom: 30, paddingHorizontal: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  card: { padding: 20, borderRadius: 16, borderWidth: 2, marginBottom: 30, position: 'relative' },
  expiredBadge: { position: 'absolute', top: -12, right: 20, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  expiredText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  footer: { gap: 15 },
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 12, elevation: 2 },
  secondaryButton: { justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 12, borderWidth: 1, backgroundColor: 'transparent' }
});