import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { typography } from '../../styles/typography';
import { FontAwesome } from '@expo/vector-icons';

const demoSteps = [
  {
    id: 1,
    icon: 'warehouse',
    titleKey: 'onboarding.demoStep1Title',
    descKey: 'onboarding.demoStep1Desc',
    imageKey: 'warehouse',
  },
  {
    id: 2,
    icon: 'barcode',
    titleKey: 'onboarding.demoStep2Title',
    descKey: 'onboarding.demoStep2Desc',
    imageKey: 'scan',
  },
  {
    id: 3,
    icon: 'inbox',
    titleKey: 'onboarding.demoStep3Title',
    descKey: 'onboarding.demoStep3Desc',
    imageKey: 'track',
  },
];

export default function DemoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < demoSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push('/onboarding/paywall');
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/paywall');
  };

  const step = demoSteps[currentStep];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={[typography.body, { color: colors.subtext }]}>
            {t('onboarding.skipDemo', 'Skip')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepIndicators}>
          {demoSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                {
                  backgroundColor: index <= currentStep ? colors.primary : colors.border,
                  width: index === currentStep ? 32 : 8,
                }
              ]}
            />
          ))}
        </View>

        <View style={styles.demoContent}>
          <Text style={[typography.h1, styles.stepTitle, { color: colors.text }]}>
            {t(step.titleKey, `Step ${step.id}`)}
          </Text>

          <Text style={[typography.body, styles.stepDesc, { color: colors.subtext }]}>
            {t(step.descKey, 'Description')}
          </Text>

          <View style={[styles.demoVisual, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FontAwesome name={step.imageKey as any} size={80} color={colors.primary} style={{ opacity: 0.3 }} />
            <Text style={[typography.caption, { color: colors.subtext, marginTop: 16 }]}>
              {t('onboarding.demoPlaceholder', 'Interactive demo visualization')}
            </Text>
          </View>

          <View style={[styles.tipBox, { backgroundColor: colors.primaryMuted }]}>
            <FontAwesome name="lightbulb-o" size={20} color={colors.primary} />
            <Text style={[typography.caption, styles.tipText, { color: colors.text }]}>
              {t(`onboarding.demoTip${step.id}`, 'Helpful tip about this feature')}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.navigation}>
        {currentStep > 0 && (
          <Pressable
            style={[styles.navButton, styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setCurrentStep(currentStep - 1)}
          >
            <FontAwesome name="arrow-left" size={16} color={colors.text} />
          </Pressable>
        )}

        <Pressable
          style={[styles.navButton, styles.nextButton, { backgroundColor: colors.primary }]}
          onPress={handleNext}
        >
          <Text style={[typography.button, { color: colors.primaryText }]}>
            {currentStep === demoSteps.length - 1
              ? t('onboarding.startTrial', 'Start Free Trial')
              : t('general.next', 'Next')
            }
          </Text>
          <FontAwesome name="arrow-right" size={16} color={colors.primaryText} style={{ marginLeft: 8 }} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 50,
    paddingHorizontal: 24,
    alignItems: 'flex-end',
    paddingBottom: 4,
  },
  skipButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
    transition: 'all 0.3s ease',
  },
  demoContent: {
    alignItems: 'center',
  },
  stepTitle: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 24,
    fontWeight: 'bold',
  },
  stepDesc: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  demoVisual: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    width: '100%',
  },
  tipText: {
    flex: 1,
    lineHeight: 16,
    fontSize: 13,
  },
  navigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  backButton: {
    borderWidth: 1,
    width: 48,
  },
  nextButton: {
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
