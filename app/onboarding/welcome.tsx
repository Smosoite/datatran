import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { typography } from '../../styles/typography';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

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
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        {/* App Icon */}
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <FontAwesome name="cubes" size={80} color="white" />
        </View>

        {/* Welcome Text */}
        <Text style={[typography.h1, styles.title]}>
          {t('onboarding.welcome', 'Welcome to StoreTool')}
        </Text>
        
        <Text style={[typography.body, styles.subtitle]}>
          {t('onboarding.welcomeSubtitle', 'Your complete inventory management solution')}
        </Text>

        {/* Feature Highlights */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <FontAwesome name="warehouse" size={24} color="white" />
            <Text style={[typography.caption, styles.featureText]}>
              {t('onboarding.organizeInventory', 'Organize Your Inventory')}
            </Text>
          </View>
          
          <View style={styles.featureItem}>
            <FontAwesome name="barcode" size={24} color="white" />
            <Text style={[typography.caption, styles.featureText]}>
              {t('onboarding.scanItems', 'Scan & Track Items')}
            </Text>
          </View>
          
          <View style={styles.featureItem}>
            <FontAwesome name="users" size={24} color="white" />
            <Text style={[typography.caption, styles.featureText]}>
              {t('onboarding.teamCollaboration', 'Team Collaboration')}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Continue Button */}
      <View style={styles.footer}>
        <Pressable 
          style={[styles.continueButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
          onPress={() => router.push('/onboarding/features')}
        >
          <Text style={[typography.button, styles.continueText, { color: colors.primary }]}>
            {t('onboarding.getStarted', 'Get Started')}
          </Text>
          <FontAwesome name="arrow-right" size={16} color={colors.primary} style={{ marginLeft: 8 }} />
        </Pressable>
        
        <Text style={[typography.caption, styles.skipText]}>
          {t('onboarding.skipIntro', 'Skip intro')}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconContainer: { 
    width: 160, 
    height: 160, 
    borderRadius: 80, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 40,
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
    marginBottom: 48,
    lineHeight: 24,
  },
  featuresContainer: { 
    width: '100%', 
    gap: 24,
  },
  featureItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12,
  },
  featureText: { 
    color: 'white', 
    marginLeft: 16,
    fontWeight: '600',
  },
  footer: { 
    paddingHorizontal: 32, 
    paddingBottom: 50,
    alignItems: 'center',
  },
  continueButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    borderRadius: 25,
    marginBottom: 16,
    minWidth: 200,
    justifyContent: 'center',
  },
  continueText: { fontWeight: 'bold' },
  skipText: { 
    color: 'rgba(255,255,255,0.7)',
    textDecorationLine: 'underline',
  },
});