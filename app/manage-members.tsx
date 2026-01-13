import { useTranslation } from 'react-i18next';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { useFocusEffect, Stack } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { useModal } from '../providers/ModalProvider';
import { showError, showSuccess } from '../lib/toast';
import { typography } from '../styles/typography';
import { FontAwesome } from '@expo/vector-icons';

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
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', user.id);

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
          const { error } = await supabase
            .from('profiles')
            .update({ workgroup_id: null, role: null }) 
            .eq('id', user.id);

          if (error) throw error;
          showSuccess(t('general.success'), t('settings.removeSuccess'));
          fetchMembers();
        } catch (err: any) {
          showError(t('general.error'), err.message);
        }
      }
    });
  };

  if (loading) return <ActivityIndicator style={styles.centered} size="large" color={colors.primary} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: t('settings.membersTitle') }} />
      
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const isMe = item.id === myProfile?.id;
          const isAdmin = item.role === 'admin';

          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* User Info Container - Flex 1 ensures it takes available space */}
              <View style={styles.userInfo}>
                <View style={[styles.avatar, { backgroundColor: colors.border }]}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
                    {item.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                
                {/* Text Container - Flex shrink handles long names */}
                <View style={styles.textContainer}>
                  <Text 
                    style={[typography.body, styles.username, { color: colors.text }]}
                    numberOfLines={1} 
                    ellipsizeMode="tail"
                  >
                    {item.username} {isMe && "(You)"}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: isAdmin ? colors.primaryMuted : colors.border }]}>
                    <Text style={[typography.caption, { color: isAdmin ? colors.primary : colors.subtext, fontWeight: 'bold' }]}>
                      {isAdmin ? t('settings.admin') : t('settings.member')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              {!isMe && (
                <View style={styles.actions}>
                  <Pressable 
                    style={[styles.iconButton, { backgroundColor: colors.background }]} 
                    onPress={() => handleToggleRole(item)}
                  >
                    <FontAwesome 
                      name={isAdmin ? "arrow-down" : "arrow-up"} 
                      size={16} 
                      color={colors.text} 
                    />
                  </Pressable>

                  <Pressable 
                    style={[styles.iconButton, { backgroundColor: 'rgba(220, 38, 38, 0.1)' }]} 
                    onPress={() => handleRemoveMember(item)}
                  >
                    <FontAwesome name="user-times" size={16} color={colors.danger} />
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center', // Align vertically center
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    // Removed 'justifyContent: space-between' to allow userInfo flex to control spacing
  },
  userInfo: {
    flex: 1, // Crucial: Takes up all remaining space on the left
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8, // Add spacing between text and action buttons
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12, // Space reserved next to picture
  },
  textContainer: {
    flex: 1, // Allows text to shrink if screen is small
    justifyContent: 'center',
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
    marginLeft: 4, // Ensure buttons never touch the text container
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