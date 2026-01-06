import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { typography } from '../../styles/typography';
import { FontAwesome } from '@expo/vector-icons';

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        <View style={styles.iconContainer}>
           <View style={[styles.iconCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
             <FontAwesome name="cubes" size={60} color={colors.primary} />
           </View>
        </View>

        {/* Welcome Text */}
        <Text style={[typography.h1, styles.title, { color: colors.text }]}>
          {t('onboarding.welcome', 'Welcome to StoreTool')}
        </Text>
        
        <Text style={[typography.body, styles.subtitle, { color: colors.subtext }]}>
          {t('onboarding.welcomeSubtitle', 'Your complete inventory management solution')}
        </Text>

        {/* Feature Highlights */}
        <View style={styles.featuresContainer}>
          <FeatureItem 
            icon="warehouse" 
            text={t('onboarding.organizeInventory', 'Organize Your Inventory')}
            colors={colors}
          />
          <FeatureItem 
            icon="barcode" 
            text={t('onboarding.scanItems', 'Scan & Track Items')}
            colors={colors} 
          />
          <FeatureItem 
            icon="users" 
            text={t('onboarding.teamCollaboration', 'Team Collaboration')}
            colors={colors} 
          />
        </View>
      </Animated.View>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <Pressable 
          style={[styles.continueButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/onboarding/features')}
        >
          <Text style={[typography.button, styles.continueText, { color: '#fff' }]}>
            {t('onboarding.getStarted', 'Get Started')}
          </Text>
          <FontAwesome name="arrow-right" size={16} color="#fff" style={{ marginLeft: 8 }} />
        </Pressable>
      </View>
    </View>
  );
}

// Helper Component for consistency
function FeatureItem({ icon, text, colors }: { icon: any, text: string, colors: any }) {
    return (
        <View style={[styles.featureItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.featureIconBox, { backgroundColor: colors.background }]}>
                <FontAwesome name={icon} size={20} color={colors.primary} />
            </View>
            <Text style={[styles.featureText, { color: colors.text }]}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  
  iconContainer: { marginBottom: 40 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },

  title: { 
    textAlign: 'center', 
    marginBottom: 16,
    fontSize: 28, 
  },
  subtitle: { 
    textAlign: 'center', 
    marginBottom: 48,
    fontSize: 16,
    lineHeight: 24,
  },
  
  featuresContainer: { 
    width: '100%', 
    gap: 16,
  },
  featureItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  featureIconBox: {
      width: 40, 
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
  },
  featureText: { 
    fontWeight: '600',
    fontSize: 15,
    flex: 1,
  },
  
  footer: { 
    paddingHorizontal: 32, 
    paddingBottom: 50,
    alignItems: 'center',
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