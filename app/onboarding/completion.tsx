// app/onboarding/completion.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { typography } from '../../styles/typography';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// Removed AsyncStorage import - we should set this AFTER the paywall
import { useOnboarding } from '../../providers/OnboardingProvider';

const { width } = Dimensions.get('window');

export default function CompletionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  // We don't need completeOnboarding here anymore
  // const { completeOnboarding } = useOnboarding();
   
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGetStarted = async () => {
    // 1. Do NOT set AsyncStorage here. 
    // If you set it here, the Root Layout might catch the change 
    // and redirect to Home before the Paywall loads.

    // 2. Navigate to Paywall
    // Ensure your Paywall route is accessible to "Incomplete" users.
    router.replace('/paywall');
  };

  return (
    <LinearGradient
      colors={[colors.primary, colors.selector]}
      style={styles.container}
    >
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim }
            ],
          }
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <FontAwesome name="check-circle" size={80} color="white" />
        </View>

        <Text style={[typography.h1, styles.title]}>
          {t('onboarding.congratulations', 'Congratulations!')}
        </Text>
        
        <Text style={[typography.body, styles.subtitle]}>
          {t('onboarding.completionMessage', 'You\'ve completed the StoreTool tour and are ready to start managing your inventory like a pro!')}
        </Text>

        {/* ... (Takeaways section remains unchanged) ... */}
        <View style={styles.takeawaysContainer}>
          <Text style={[typography.h3, styles.takeawaysTitle]}>
            {t('onboarding.youLearned', 'What you learned:')}
          </Text>
          
          <View style={styles.takeawaysList}>
            <View style={styles.takeawayItem}>
              <FontAwesome name="check" size={16} color="white" />
              <Text style={[typography.body, styles.takeawayText]}>
                {t('onboarding.takeaway1', 'How to organize warehouses and storage units')}
              </Text>
            </View>
            
            <View style={styles.takeawayItem}>
              <FontAwesome name="check" size={16} color="white" />
              <Text style={[typography.body, styles.takeawayText]}>
                {t('onboarding.takeaway2', 'Managing inventory with real-time tracking')}
              </Text>
            </View>
            
            <View style={styles.takeawayItem}>
              <FontAwesome name="check" size={16} color="white" />
              <Text style={[typography.body, styles.takeawayText]}>
                {t('onboarding.takeaway3', 'Using barcode scanning for quick operations')}
              </Text>
            </View>
            
            <View style={styles.takeawayItem}>
              <FontAwesome name="check" size={16} color="white" />
              <Text style={[typography.body, styles.takeawayText]}>
                {t('onboarding.takeaway4', 'Team collaboration and role management')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.nextStepsContainer}>
          <Text style={[typography.body, styles.nextStepsText]}>
            {t('onboarding.nextSteps', 'Ready to unlock the full potential of StoreTool?')}
          </Text>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <Pressable 
          style={[styles.getStartedButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
          onPress={handleGetStarted}
        >
          <Text style={[typography.button, styles.getStartedText, { color: colors.primary }]}>
            {t('onboarding.unlockFullAccess', 'Unlock Full Access')}
          </Text>
          <FontAwesome name="unlock" size={16} color={colors.primary} style={{ marginLeft: 8 }} />
        </Pressable>
        
        <Text style={[typography.caption, styles.footerNote]}>
          {t('onboarding.freeTrialNote', '7-day free trial • No commitment')}
        </Text>
      </View>
    </LinearGradient>
  );
}

// ... styles remain unchanged
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  iconContainer: { 
    width: 160, 
    height: 160, 
    borderRadius: 80, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 32,
  },
  title: { 
    color: 'white', 
    textAlign: 'center', 
    marginBottom: 16, 
    fontWeight: 'bold',
  },
  subtitle: { 
    color: 'rgba(255,255,255,0.9)', 
    textAlign: 'center', 
    marginBottom: 32, 
    lineHeight: 24,
  },
  takeawaysContainer: {
    width: '100%',
    marginBottom: 32,
  },
  takeawaysTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  takeawaysList: { gap: 12 },
  takeawayItem: { 
    flexDirection: 'row', 
    alignItems: 'flex-start',
    gap: 12,
  },
  takeawayText: { 
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
    lineHeight: 20,
  },
  nextStepsContainer: {
    alignItems: 'center',
  },
  nextStepsText: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: { 
    paddingHorizontal: 32, 
    paddingBottom: 50,
    alignItems: 'center',
  },
  getStartedButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    borderRadius: 25,
    marginBottom: 12,
    minWidth: 250,
    justifyContent: 'center',
  },
  getStartedText: { fontWeight: 'bold', fontSize: 16 },
  footerNote: { 
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
});