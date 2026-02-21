import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '../store/useAppStore';
import { allLessons } from '../data/lessons';
import { colors, spacing, radius } from '../constants/theme';
import { Lesson } from '../types';
import { useAuth } from '../lib/AuthContext';
import { fetchSpellingLists, deleteSpellingList } from '../lib/spellListsApi';

function UserAvatar({ email }: { email?: string }) {
  const initial = email ? email[0].toUpperCase() : '?';
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const progress = useAppStore((s) => s.progress);
  const customLessons = useAppStore((s) => s.customLessons);
  const setCustomLessons = useAppStore((s) => s.setCustomLessons);
  const deleteCustomLessonFromStore = useAppStore((s) => s.deleteCustomLesson);
  const { user, signOut } = useAuth();
  const [loadingLessons, setLoadingLessons] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoadingLessons(true);
    fetchSpellingLists()
      .then((lessons) => setCustomLessons(lessons))
      .catch(() => Alert.alert('Error', 'Could not load your lessons. Please try again.'))
      .finally(() => setLoadingLessons(false));
  }, [user]);

  const allAvailable = useMemo(() => [...allLessons, ...customLessons], [customLessons]);

  const stats = useMemo(() => {
    const totalItems = allAvailable.reduce((sum, l) => sum + l.items.length, 0);
    const completedItems = Object.values(progress).filter(
      (p) => p.writingComplete || p.pinyinStage >= 4,
    ).length;
    const masteryPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    return { totalItems, completedItems, masteryPct };
  }, [allAvailable, progress]);

  const getLessonProgress = (lessonId: string, itemCount: number) => {
    let completed = 0;
    for (let i = 0; i < itemCount; i++) {
      const key = `${lessonId}-${i + 1}`;
      const p = progress[key];
      if (p && (p.writingComplete || p.pinyinStage >= 4)) completed++;
    }
    return completed;
  };

  const handleDelete = (lesson: Lesson) => {
    const isCustom = !allLessons.some((l) => l.id === lesson.id);
    if (!isCustom) return;
    Alert.alert('Delete Lesson', `Delete "${lesson.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSpellingList(lesson.id);
            deleteCustomLessonFromStore(lesson.id);
          } catch {
            Alert.alert('Error', 'Failed to delete lesson. Please try again.');
          }
        },
      },
    ]);
  };

  const handleSignOut = async () => {
    await signOut();
    setCustomLessons([]);
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>小小听写伴</Text>
          <Text style={styles.appSubtitle}>Chinese Spelling Practice</Text>
        </View>
        <Pressable onPress={handleSignOut} hitSlop={8}>
          <UserAvatar email={user?.email} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.masteryPct}%</Text>
            <Text style={styles.statLabel}>Mastery</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completedItems}</Text>
            <Text style={styles.statLabel}>Words{'\n'}Mastered</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{allAvailable.length}</Text>
            <Text style={styles.statLabel}>Lists</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnPrimary, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/upload')}
          >
            <Text style={styles.actionBtnIcon}>📝</Text>
            <Text style={styles.actionBtnLabel}>New List</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnSecondary, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/upload/scan')}
          >
            <Text style={styles.actionBtnIcon}>📷</Text>
            <Text style={styles.actionBtnLabel}>Photo OCR</Text>
          </Pressable>
        </View>

        {/* Current Lists Header */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Current Lists</Text>
          {loadingLessons && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        {/* Lesson Rows */}
        {allAvailable.map((lesson) => {
          const completed = getLessonProgress(lesson.id, lesson.items.length);
          const total = lesson.items.length;
          const pct = total > 0 ? (completed / total) * 100 : 0;
          const isCustom = !allLessons.some((l) => l.id === lesson.id);

          return (
            <Pressable
              key={lesson.id}
              style={({ pressed }) => [styles.lessonRow, pressed && { opacity: 0.8 }]}
              onPress={() => {
                useAppStore.getState().setLesson(lesson.id);
                router.push(`/lesson/${lesson.id}`);
              }}
              onLongPress={isCustom ? () => handleDelete(lesson) : undefined}
            >
              <View style={styles.lessonRowContent}>
                <View style={styles.lessonRowTop}>
                  <Text style={styles.lessonLabel}>{lesson.label}</Text>
                  {lesson.primaryLevel != null && (
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>P{lesson.primaryLevel}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.lessonMeta}>
                  {lesson.lessonName}
                  {lesson.date ? ` · ${lesson.date}` : ''}
                  {lesson.school ? ` · ${lesson.school}` : ''}
                </Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                </View>
                <Text style={styles.progressText}>{completed}/{total} words</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          );
        })}

        {allAvailable.length === 0 && !loadingLessons && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No lists yet</Text>
            <Text style={styles.emptySubtext}>Tap "New List" to create your first spelling list</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <View style={[styles.tabItem, styles.tabItemActive]}>
          <Text style={styles.tabIconActive}>⌂</Text>
          <Text style={styles.tabLabelActive}>Home</Text>
        </View>
        <Pressable style={styles.tabItem} onPress={() => router.push('/upload')}>
          <Text style={styles.tabIcon}>☰</Text>
          <Text style={styles.tabLabel}>Lists</Text>
        </Pressable>
        <Pressable style={styles.tabItem} onPress={() => router.push('/parent')}>
          <Text style={styles.tabIcon}>◎</Text>
          <Text style={styles.tabLabel}>Progress</Text>
        </Pressable>
        <Pressable style={styles.tabItem} onPress={handleSignOut}>
          <Text style={styles.tabIcon}>○</Text>
          <Text style={styles.tabLabel}>Profile</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 52, // safe area top approximation for web
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  appSubtitle: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  // Stats Card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnPrimary: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  actionBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  actionBtnIcon: {
    fontSize: 28,
  },
  actionBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  // Section header
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  // Lesson rows
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  lessonRowContent: {
    flex: 1,
    gap: 4,
  },
  lessonRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lessonLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  levelBadge: {
    backgroundColor: colors.primary + '20',
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  lessonMeta: {
    fontSize: 13,
    color: colors.textLight,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.correct,
  },
  progressText: {
    fontSize: 12,
    color: colors.textLight,
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Bottom tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 20, // safe area bottom
    paddingTop: spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  tabItemActive: {
    // no extra style, handled by text colors
  },
  tabIcon: {
    fontSize: 22,
    color: colors.textMuted,
  },
  tabLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  tabIconActive: {
    fontSize: 22,
    color: colors.primary,
  },
  tabLabelActive: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
});
