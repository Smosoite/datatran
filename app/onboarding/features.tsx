import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { typography } from '../../styles/typography';
import { FontAwesome } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const features = [
  {
    icon: 'warehouse',
    titleKey: 'onboarding.warehouseManagement',
    title: 'Warehouse Management',
    descriptionKey: 'onboarding.warehouseDesc',
    description: 'Create and organize multiple warehouses with custom storage units and locations.',
  },
  {
    icon: 'search',
    titleKey: 'onboarding.smartSearch',
    title: 'Smart Search & Find',
    descriptionKey: 'onboarding.smartSearchDesc', 
    description: 'Quickly locate any item with powerful search and filtering capabilities.',
  },
  {
    icon: 'barcode',
    titleKey: 'onboarding.barcodeScanning',
    title: 'Barcode Scanning',
    descriptionKey: 'onboarding.barcodeScanningDesc',
    description: 'Scan barcodes to instantly add, find, or update inventory items.',
  },
  {
    icon: 'refresh',
    titleKey: 'onboarding.restockAlerts',
    title: 'Restock Alerts',
    descriptionKey: 'onboarding.restockAlertsDesc',
    description: 'Get notified when items are running low and need restocking.',
  },
  {
    icon: 'users',
    titleKey: 'onboarding.teamCollaboration',
    title: 'Team Collaboration',
    descriptionKey: 'onboarding.teamCollaborationDesc',
    description: 'Work together with your team using shared workgroups and role-based access.',
  },
  {
    icon: 'chart-line',
    titleKey: 'onboarding.analytics',
    title: 'Analytics & Reports',
    descriptionKey: 'onboarding.analyticsDesc',
    description: 'Track inventory movements and generate detailed reports for better insights.',
  },
];

export default function FeaturesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / width);
    setCurrentIndex(index);
  };

  const goToNext = () => {
    if (currentIndex < features.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      router.push('/onboarding/completion');
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      scrollViewRef.current?.scrollTo({ x: prevIndex * width, animated: true });
      setCurrentIndex(prevIndex);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[typography.h1, styles.title, { color: colors.text }]}>
          {t('onboarding.keyFeatures', 'Key Features')}
        </Text>
        <Text style={[typography.body, styles.subtitle, { color: colors.subtext }]}>
          {t('onboarding.featuresSubtitle', 'Discover what makes StoreTool powerful')}
        </Text>
      </View>

      {/* Feature Cards */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {features.map((feature, index) => (
          <View key={index} style={[styles.featureCard, { width }]}>
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primaryMuted }]}>
                <FontAwesome name={feature.icon as any} size={48} color={colors.primary} />
              </View>
              
              <Text style={[typography.h2, styles.featureTitle, { color: colors.text }]}>
                {t(feature.titleKey, feature.title)}
              </Text>
              
              <Text style={[typography.body, styles.featureDescription, { color: colors.subtext }]}>
                {t(feature.descriptionKey, feature.description)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Page Indicators */}
      <View style={styles.indicators}>
        {features.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              {
                backgroundColor: index === currentIndex ? colors.primary : colors.border,
                width: index === currentIndex ? 24 : 8,
              }
            ]}
          />
        ))}
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <Pressable
          style={[
            styles.navButton,
            { backgroundColor: colors.card, borderColor: colors.border },
            currentIndex === 0 && styles.disabledButton
          ]}
          onPress={goToPrevious}
          disabled={currentIndex === 0}
        >
          <FontAwesome name="arrow-left" size={16} color={currentIndex === 0 ? colors.subtext : colors.text} />
          <Text style={[typography.button, { color: currentIndex === 0 ? colors.subtext : colors.text, marginLeft: 8 }]}>
            {t('general.previous', 'Previous')}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.navButton, { backgroundColor: colors.primary }]}
          onPress={goToNext}
        >
          <Text style={[typography.button, { color: colors.primaryText, marginRight: 8 }]}>
            {currentIndex === features.length - 1 
              ? t('onboarding.startDemo', 'Start Demo') 
              : t('general.next', 'Next')
            }
          </Text>
          <FontAwesome name="arrow-right" size={16} color={colors.primaryText} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20 },
  title: { textAlign: 'center', marginBottom: 8, fontWeight: 'bold' },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  scrollView: { flex: 1 },
  featureCard: { 
    flex: 1, 
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  cardContent: { 
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  featureTitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  featureDescription: {
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
    transition: 'all 0.3s ease',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
  },
  disabledButton: { opacity: 0.5 },
});