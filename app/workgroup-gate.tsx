import { useTranslation } from 'react-i18next';
import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { typography } from '../styles/typography';

export default function WorkgroupGateScreen() {
    const { t } = useTranslation();
    const { colors } = useTheme(); // --- FIX: Correct way .to get colors ---
    const router = useRouter();
    
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[typography.h3, styles.header, { color: colors.text }]}>{t('auth.gateHeader')}</Text>
            <Text style={[typography.body, styles.subHeader, { color: colors.subtext }]}>{t('auth.gateSubheader')}</Text>

            <Pressable 
              style={[styles.button, { backgroundColor: colors.primary }]} 
              onPress={() => router.push('/create-workgroup')}
            >
                <Text style={[typography.button, styles.buttonText, { color: colors.text }]}>{t('auth.createWorkgroup')}</Text>
            </Pressable>

            <Pressable 
              style={[styles.button, styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]} 
              onPress={() => router.push('/join-workgroup')}
            >
                <Text style={[typography.button, styles.buttonText, { color: colors.primary }]}>{t('auth.joinWithCode')}</Text>
            </Pressable>

            <Pressable style={{ marginTop: 20 }} onPress={() => supabase.auth.signOut()}>
                <Text style={[typography.caption, styles.link, { color: colors.subtext }]}>{t('auth.signOut')}</Text>
            </Pressable>
        </View>
    );
}

// --- FIX: Stylesheet cleaned of hard-coded colors ---
const styles = StyleSheet.create({
    container: { 
      flex: 1, 
      justifyContent: 'center', 
      padding: 24 
    },
    header: {
      fontWeight: 'bold', 
      textAlign: 'center', 
      marginBottom: 8 
    },
    subHeader: {
      textAlign: 'center', 
      marginBottom: 48 
    },
    button: { 
      padding: 16, 
      borderRadius: 8, 
      alignItems: 'center', 
      marginBottom: 16 
    },
    buttonText: { 
      fontWeight: 'bold',
    },
    secondaryButton: { 
      borderWidth: 1 
    },
    link: { 
      marginTop: 16, 
      textAlign: 'center' 
    },
});