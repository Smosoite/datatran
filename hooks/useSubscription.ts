import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showSuccess, showError, showInfo } from '../lib/toast';

const TRIAL_DURATION_HOURS = 168; // 7 Days
const WARNING_THRESHOLD_HOURS = 24; // Warn when 1 day left

export type SubscriptionStatus = 'loading' | 'none' | 'trial_active' | 'trial_expired' | 'purchased';

export const useSubscription = () => {
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [hoursLeft, setHoursLeft] = useState<number>(0);

  const checkSubscription = useCallback(async () => {
    try {
      // 1. Check if user has already bought it
      const isPurchased = await AsyncStorage.getItem('IS_PRO_USER');
      if (isPurchased === 'true') {
        setStatus('purchased');
        return;
      }

      // 2. Check Trial Status
      const trialStartStr = await AsyncStorage.getItem('TRIAL_START_DATE');
      
      if (!trialStartStr) {
        setStatus('none');
        return;
      }

      const trialStart = parseInt(trialStartStr, 10);
      const now = Date.now();
      const hoursElapsed = (now - trialStart) / (1000 * 60 * 60);
      const remaining = TRIAL_DURATION_HOURS - hoursElapsed;

      setHoursLeft(Math.max(0, remaining));

      if (remaining <= 0) {
        setStatus('trial_expired');
      } else {
        setStatus('trial_active');
        
        // 3. Trigger Toast Warning (Only if we haven't warned recently)
        // Note: In a real app, you might flag this so it only shows once per session
        if (remaining < WARNING_THRESHOLD_HOURS) {
            // We use a simple session check variable or just show it (toast libraries usually handle spam prevention)
            // showInfo("Trial Ending Soon", `You have ${Math.floor(remaining)} hours left in your free trial.`);
        }
      }

    } catch (e) {
      console.error("Subscription check failed", e);
      setStatus('none');
    }
  }, []);

  const startTrial = async () => {
    try {
      await AsyncStorage.setItem('TRIAL_START_DATE', Date.now().toString());
      await checkSubscription();
      return true;
    } catch (e) {
      return false;
    }
  };

  const buySubscription = async () => {
    try {
      // HERE IS WHERE YOU CONNECT APPLE/GOOGLE PAY (e.g., RevenueCat)
      // await Purchases.purchasePackage(package);
      
      await AsyncStorage.setItem('IS_PRO_USER', 'true');
      await checkSubscription();
      return true;
    } catch (e) {
      return false;
    }
  };

  // Run check on mount
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return {
    status,
    hoursLeft,
    checkSubscription,
    startTrial,
    buySubscription
  };
};