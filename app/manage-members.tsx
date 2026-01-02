import { useTranslation } from 'react-i18next';
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { useFocusEffect, Stack } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { useModal } from '../providers/ModalProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';
import { FontAwesome } from '@expo/vector-icons';

// --- COPILOT IMPORTS ---
import { CopilotStep, walkthroughable, useCopilot } from "react-native-copilot";
import AsyncStorage from '@react-native-async-storage/async-storage';

const WalkableView = walkthroughable(View);
const WalkablePressable = walkthroughable(Pressable);

type UserProfile = {
  id: string;
  username: string;
  role: 'admin' | 'member';
};

export default function ManageMembersScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { profile: myProfile } = useAuth(); 
  const { showConfirmation } = useModal();
  
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // --- COPILOT STATE ---
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [tourStarted, setTourStarted] = useState(false);

  // --- COPILOT HOOK ---
  const { start: startTour } = useCopilot();

  // --- START TOUR AFTER DATA LOADS AND LAYOUT IS READY ---
  useEffect(() => {
    // Only start tour when: not loading, layout ready, has members, and tour not started
    if (loading || !isLayoutReady || members.length === 0 || tourStarted) return;

    const checkAndStartTour = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem('HAS_SEEN_MEMBERS_TOUR');
        if (!hasSeen) {
          // Wait for FlatList to render items properly
          setTimeout(() => {
            startTour();
            setTourStarted(true);
          }, 800);
          await AsyncStorage.setItem('HAS_SEEN_MEMBERS_TOUR', 'true');
        }
      } catch (e) { 
        console.warn('Tour check failed', e); 
      }
    };
    
    checkAndStartTour();
  }, [loading, isLayoutReady, members.length, tourStarted]);

  const fetchMembers = useCallback(async () => {
    if (!myProfile?.workgroup_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role')
        .eq('workgroup_id', myProfile.workgroup_id)
        .order('role', { ascending: true }) 
        .order('username', { ascending: true });

      if (error) throw error;
      setMembers(data as UserProfile[] || []);
    } catch (err: any) {
      showError(t('general.error'), err.message);
    } finally {
      setLoading(false);
    }
  }, [myProfile?.workgroup_id, t]);

  useFocusEffect(useCallback(() => { fetchMembers(); }, [fetchMembers]));

  const handleToggleRole = async (user: UserProfile) => {
    if (user.id === myProfile?.id) return; 

    const newRole = user.role === 'admin' ? 'member' : 'admin';
    const messageKey = newRole === 'admin' ? 'settings.promoteSuccess' : 'settings.demoteSuccess';

    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
      if (error) throw error;
      showSuccess(t('general.success'), t(messageKey));
      fetchMembers();
    } catch (err: any) {
      showError(t('general.error'), err.message);
    }
  };

  const handleRemoveMember = (user: UserProfile) => {
    if (user.id === myProfile?.id) return;

    showConfirmation({
      title: 'settings.removeMember',
      message: t('settings.removeMemberConfirm', { username: user.username }),
      confirmText: 'general.delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('profiles').update({ workgroup_id: null, role: null }).eq('id', user.id);
          if (error) throw error;
          showSuccess(t('general.success'), t('settings.removeSuccess'));
          fetchMembers();
        } catch (err: any) {
          showError(t('general.error'), err.message);
        }
      }
    });
  };

  const renderMemberCard = ({ item, index }: { item: UserProfile; index: number }) => {
    const isMe = item.id === myProfile?.id;
    const isAdmin = item.role === 'admin';
    
    // Find the first non-current-user member for highlighting action buttons
    const firstOtherMemberIndex = members.findIndex(m => m.id !== myProfile?.id);
    const shouldHighlightActions = !isMe && index === firstOtherMemberIndex;

    return (
      <View>
        {/* Step 1: Highlight the first member card */}
        {index === 0 ? (
          <CopilotStep 
            text={t('pilot.memberscard') || "Manage user roles and permissions here."} 
            order={1} 
            name="memberCard"
          >
            <WalkableView 
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} 
              collapsable={false}
            >
              <View style={styles.userInfo}>
                <View style={[styles.avatar, { backgroundColor: colors.border }]}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
                    {item.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={[typography.body, styles.username, { color: colors.text }]}>
                    {item.username} {isMe && "(You)"}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: isAdmin ? colors.primaryMuted : colors.border }]}>
                    <Text style={[typography.caption, { color: isAdmin ? colors.primary : colors.subtext, fontWeight: 'bold' }]}>
                      {isAdmin ? t('settings.admin') : t('settings.member')}
                    </Text>
                  </View>
                </View>
              </View>
              
              {!isMe && (
                <View style={styles.actions}>
                  <Pressable 
                    style={[styles.iconButton, { backgroundColor: colors.background }]} 
                    onPress={() => handleToggleRole(item)}
                  >
                    <FontAwesome name={isAdmin ? "arrow-down" : "arrow-up"} size={16} color={colors.text} />
                  </Pressable>
                  <Pressable 
                    style={[styles.iconButton, { backgroundColor: 'rgba(220, 38, 38, 0.1)' }]} 
                    onPress={() => handleRemoveMember(item)}
                  >
                    <FontAwesome name="user-times" size={16} color={colors.danger} />
                  </Pressable>
                </View>
              )}
            </WalkableView>
          </CopilotStep>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: colors.border }]}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
                  {item.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={[typography.body, styles.username, { color: colors.text }]}>
                  {item.username} {isMe && "(You)"}
                </Text>
                <View style={[styles.badge, { backgroundColor: isAdmin ? colors.primaryMuted : colors.border }]}>
                  <Text style={[typography.caption, { color: isAdmin ? colors.primary : colors.subtext, fontWeight: 'bold' }]}>
                    {isAdmin ? t('settings.admin') : t('settings.member')}
                  </Text>
                </View>
              </View>
            </View>

            {!isMe && (
              <View style={styles.actions}>
                {/* Steps 2 & 3: Highlight action buttons for the first other member */}
                {shouldHighlightActions ? (
                  <>
                    <CopilotStep 
                      text={t('pilot.promote') || "Promote or demote members between admin and member roles."} 
                      order={2} 
                      name="promoteUser"
                    >
                      <WalkablePressable 
                        collapsable={false}
                        style={[styles.iconButton, { backgroundColor: colors.background }]} 
                        onPress={() => handleToggleRole(item)}
                      >
                        <FontAwesome name={isAdmin ? "arrow-down" : "arrow-up"} size={16} color={colors.text} />
                      </WalkablePressable>
                    </CopilotStep>
                    
                    <CopilotStep 
                      text={t('pilot.permaban') || "Remove members from your workgroup."} 
                      order={3} 
                      name="removeUser"
                    >
                      <WalkablePressable 
                        collapsable={false}
                        style={[styles.iconButton, { backgroundColor: 'rgba(220, 38, 38, 0.1)' }]} 
                        onPress={() => handleRemoveMember(item)}
                      >
                        <FontAwesome name="user-times" size={16} color={colors.danger} />
                      </WalkablePressable>
                    </CopilotStep>
                  </>
                ) : (
                  <>
                    <Pressable 
                      style={[styles.iconButton, { backgroundColor: colors.background }]} 
                      onPress={() => handleToggleRole(item)}
                    >
                      <FontAwesome name={isAdmin ? "arrow-down" : "arrow-up"} size={16} color={colors.text} />
                    </Pressable>
                    <Pressable 
                      style={[styles.iconButton, { backgroundColor: 'rgba(220, 38, 38, 0.1)' }]} 
                      onPress={() => handleRemoveMember(item)}
                    >
                      <FontAwesome name="user-times" size={16} color={colors.danger} />
                    </Pressable>
                  </>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return <ActivityIndicator style={styles.centered} size="large" color={colors.primary} />;
  }

  return (
    <View 
      style={[styles.container, { backgroundColor: colors.background }]}
      onLayout={() => setIsLayoutReady(true)}
    >
      <Stack.Screen options={{ title: t('settings.membersTitle') }} />
      
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={renderMemberCard}
        ListEmptyComponent={() => (
          <Text style={[styles.centered, { color: colors.subtext }]}>
            {t('general.noMembers') || 'No members found.'}
          </Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  username: {
    fontWeight: '600',
    marginBottom: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});