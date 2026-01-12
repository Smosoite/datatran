import React, { useEffect, useState, useRef } from 'react'; // Added useRef
import { View, Text, StyleSheet, Pressable, Animated, ScrollView, Image, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { typography } from '../../styles/typography';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const capabilities = [
  { icon: 'warehouse', titleKey: 'onboarding.warehouseManagement', descKey: 'onboarding.warehouseDesc' },
  { icon: 'barcode', titleKey: 'onboarding.barcodeScanning', descKey: 'onboarding.barcodeScanningDesc' },
  { icon: 'users', titleKey: 'onboarding.teamCollaboration', descKey: 'onboarding.teamCollaborationDesc' },
  { icon: 'refresh', titleKey: 'onboarding.restockAlerts', descKey: 'onboarding.restockAlertsDesc' },
  { icon: 'search', titleKey: 'onboarding.smartSearch', descKey: 'onboarding.smartSearchDesc' },
  { icon: 'chart-line', titleKey: 'onboarding.analytics', descKey: 'onboarding.analyticsDesc' },
];

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  // --- FIX START: Use useRef to persist values across re-renders ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const scrollIndicatorOpacity = useRef(new Animated.Value(1)).current;
  // --- FIX END ---

  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(buttonOpacity, {
        toValue: isScrolledToBottom ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scrollIndicatorOpacity, {
        toValue: isScrolledToBottom ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, [isScrolledToBottom]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const paddingToBottom = 20;
    const isAtBottom = contentOffset.y >= contentSize.height - layoutMeasurement.height - paddingToBottom;
    setIsScrolledToBottom(isAtBottom);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.iconContainer}>
             <View style={[styles.iconCircle, { backgroundColor: '#FFFFFF', borderColor: colors.card }]}>
    <Image
      source={require('../../assets/images/icon.png')}
      style={{ width: 60, height: 60, resizeMode: 'contain' }}
      accessibilityLabel="App Icon"
    />
  </View>
</View>

          <Text style={[typography.h1, styles.title, { color: colors.text }]}>
            {t('onboarding.welcome', 'Welcome to StoreTool')}
          </Text>

          <Text style={[typography.body, styles.subtitle, { color: colors.subtext }]}>
            {t('onboarding.welcomeSubtitle', 'Your complete inventory management solution')}
          </Text>

          <View style={styles.capabilitiesContainer}>
            {capabilities.map((capability, index) => (
              <View
                key={index}
                style={[styles.capabilityItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.capabilityIconBox, { backgroundColor: colors.primaryMuted }]}>
                  <FontAwesome name={capability.icon as any} size={24} color={colors.primary} />
                </View>
                <View style={styles.capabilityText}>
                  <Text style={[typography.body, styles.capabilityTitle, { color: colors.text }]}>
                    {t(capability.titleKey)}
                  </Text>
                  <Text style={[typography.caption, styles.capabilityDesc, { color: colors.subtext }]}>
                    {t(capability.descKey)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/*<View style={[styles.whyContainer, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
              <Text style={[typography.h3, styles.whyTitle, { color: colors.primary }]}>
              {t('onboarding.whyYouNeedIt', 'Why You Need StoreTool')}
            </Text>
            <Text style={[typography.body, styles.whyText, { color: colors.text }]}>
              {t('onboarding.whyDescription', 'Stop losing track of inventory, wasting time searching for items, and dealing with stockouts. StoreTool gives you complete visibility and control over your entire inventory operation.')}
            </Text>
          </View>*/}
        </Animated.View>
      </ScrollView>

      {/* Scroll Indicator */}
      <Animated.View
        style={[
          styles.scrollIndicator,
          { opacity: scrollIndicatorOpacity }
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['transparent', colors.background + 'E6', colors.background]}
          locations={[0, 0.3, 1]}
          style={styles.gradient}
        >
          <View style={styles.scrollHint}>
            <FontAwesome name="chevron-down" size={16} color={colors.subtext} />
            <Text style={[typography.caption, { color: colors.subtext, marginTop: 4 }]}>
              {t('onboarding.scrollToSeeMore', 'Scroll to see more')}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Continue Button */}
      <Animated.View
        style={[
          styles.footer,
          {
            opacity: buttonOpacity,
            transform: [{
              translateY: buttonOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })
            }]
          }
        ]}
        pointerEvents={isScrolledToBottom ? 'auto' : 'none'}
      >
        <View style={[styles.footerGradient, { backgroundColor: colors.background }]}>
          <Pressable
            style={[styles.continueButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/onboarding/demo')}
          >
            <Text style={[typography.button, styles.continueText, { color: '#fff' }]}>
              {t('onboarding.seeHowItWorks', 'See How It Works')}
            </Text>
            <FontAwesome name="arrow-right" size={16} color="#fff" style={{ marginLeft: 8 }} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 160 },
  content: { alignItems: 'center' },

  iconContainer: { marginBottom: 24 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 8 },

  title: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 40,
    fontSize: 16,
    lineHeight: 24,
  },

  capabilitiesContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  capabilityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  capabilityIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  capabilityText: {
    flex: 1,
  },
  capabilityTitle: {
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 4,
  },
  capabilityDesc: {
    fontSize: 13,
    lineHeight: 18,
  },

  whyContainer: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  whyTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  whyText: {
    lineHeight: 22,
    textAlign: 'center',
  },

  scrollIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    justifyContent: 'flex-end',
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 30,
  },
  scrollHint: {
    alignItems: 'center',
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  continueText: { fontWeight: 'bold', fontSize: 16 },
});