// app/onboarding/completion.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { typography } from '../../styles/typography';
import { FontAwesome } from '@expo/vector-icons';

export default function CompletionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

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
    // Navigate to Paywall to finalize account setup
    router.replace('/onboarding/paywall');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
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
        <View style={styles.iconContainer}>
          <FontAwesome name="check-circle" size={80} color={colors.success || '#4CAF50'} />
        </View>

        <Text style={[typography.h1, styles.title, { color: colors.text }]}>
          {t('onboarding.congratulations', 'You are ready!')}
        </Text>
        
        <Text style={[typography.body, styles.subtitle, { color: colors.subtext }]}>
          {t('onboarding.completionMessage', "You've completed the tour. Now, let's unlock the full power of StoreTool.")}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[typography.h3, styles.cardTitle, { color: colors.text }]}>
            {t('onboarding.youLearned', 'What you can do now:')}
          </Text>
          
          <View style={styles.list}>
            <CheckItem text={t('onboarding.takeaway1', 'Organize warehouses & shelves')} colors={colors} />
            <CheckItem text={t('onboarding.takeaway2', 'Track stock in real-time')} colors={colors} />
            <CheckItem text={t('onboarding.takeaway3', 'Scan items instantly')} colors={colors} />
            <CheckItem text={t('onboarding.takeaway4', 'Manage your team')} colors={colors} />
          </View>
        </View>

      </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <Pressable 
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleGetStarted}
        >
          <Text style={[typography.button, styles.buttonText, { color: '#fff' }]}>
            {t('onboarding.unlockFullAccess', 'Unlock Full Access')}
          </Text>
          <FontAwesome name="unlock-alt" size={16} color="#fff" style={{ marginLeft: 8 }} />
        </Pressable>
        
        <Text style={[typography.caption, styles.footerNote, { color: colors.subtext }]}>
          {t('onboarding.freeTrialNote', 'Start your 7-day free trial')}
        </Text>
      </View>
    </View>
  );
}

function CheckItem({ text, colors }: { text: string, colors: any }) {
    return (
        <View style={[styles.checkItem, { backgroundColor: colors.background }]}>
            <FontAwesome name="check" size={14} color={colors.success || '#4CAF50'} style={{ marginTop: 2 }} />
            <Text style={[styles.checkText, { color: colors.text }]}>{text}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  iconContainer: { 
    marginBottom: 24,
  },
  title: { 
    textAlign: 'center', 
    marginBottom: 12, 
    fontSize: 28 
  },
  subtitle: { 
    textAlign: 'center', 
    marginBottom: 40, 
    lineHeight: 24,
    maxWidth: '90%'
  },
  
  // Card Style
  card: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: {
      marginBottom: 16,
      textAlign: 'center',
      fontSize: 14,
      textTransform: 'uppercase',
      opacity: 0.8,
      letterSpacing: 1
  },
  list: { gap: 12 },
  checkItem: { 
    flexDirection: 'row', 
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 10,
  },
  checkText: { 
    flex: 1,
    fontSize: 14,
    fontWeight: '500'
  },
  
  footer: { 
    paddingHorizontal: 32, 
    paddingBottom: 50, 
    alignItems: 'center',
  },
  button: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18, 
    paddingHorizontal: 32, 
    borderRadius: 16,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonText: { fontWeight: 'bold', fontSize: 16 },
  footerNote: { 
    textAlign: 'center',
  },
});