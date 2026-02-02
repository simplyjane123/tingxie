import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import { allLessons } from '../../data/lessons';
import { useAppStore } from '../../store/useAppStore';
import { colors, spacing, radius, typography } from '../../constants/theme';

export default function ParentDashboard() {
  const progress = useAppStore((s) => s.progress);

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.title}>家长看板</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {allLessons.map((lesson) => {
          let writingDone = 0;
          let pinyinDone = 0;
          let totalErrors = 0;
          const toneErrors: Record<string, number> = {};

          lesson.items.forEach((item) => {
            const p = progress[item.id];
            if (!p) return;

            if (p.writingComplete) writingDone++;
            if (p.pinyinStage >= 4) pinyinDone++;
            totalErrors += p.errors.length;

            // Parse tone errors
            p.errors.forEach((e) => {
              if (e.startsWith('tone:') || e.startsWith('s4tone:')) {
                const parts = e.split(':');
                const key = `${parts[1]} (预期${parts[2]?.replace('expected', '')})`;
                toneErrors[key] = (toneErrors[key] || 0) + 1;
              }
            });
          });

          const total = lesson.items.length;
          const hanziItems = lesson.items.filter(i => !!i.characters).length;
          const pinyinItems = lesson.items.filter(i => i.type === 'pinyin' || i.type === 'mixed').length;

          return (
            <View key={lesson.id} style={styles.lessonCard}>
              <Text style={styles.lessonLabel}>{lesson.label} · {lesson.lessonName}</Text>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{writingDone}/{hanziItems}</Text>
                  <Text style={styles.statLabel}>写字完成</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{pinyinDone}/{pinyinItems}</Text>
                  <Text style={styles.statLabel}>拼音完成</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, totalErrors > 0 && { color: colors.incorrect }]}>
                    {totalErrors}
                  </Text>
                  <Text style={styles.statLabel}>错误次数</Text>
                </View>
              </View>

              {Object.keys(toneErrors).length > 0 && (
                <View style={styles.errorsSection}>
                  <Text style={styles.errorsTitle}>声调困难:</Text>
                  {Object.entries(toneErrors).map(([key, count]) => (
                    <Text key={key} style={styles.errorItem}>
                      {key}: {count}次
                    </Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  backText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '500',
  },
  title: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.text,
  },
  lessonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  lessonLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textLight,
  },
  errorsSection: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  errorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.incorrect,
  },
  errorItem: {
    fontSize: 13,
    color: colors.textLight,
    paddingLeft: spacing.md,
  },
});
