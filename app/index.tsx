import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import ScreenWrapper from '../components/common/ScreenWrapper';
import { allLessons } from '../data/lessons';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing, radius, typography } from '../constants/theme';

export default function HomeScreen() {
  const progress = useAppStore((s) => s.progress);

  const getLessonProgress = (lessonId: string, itemCount: number) => {
    let completed = 0;
    for (let i = 0; i < itemCount; i++) {
      const key = `${lessonId}-${i + 1}`;
      const p = progress[key];
      if (p && (p.writingComplete || p.pinyinStage >= 4)) {
        completed++;
      }
    }
    return completed;
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.title}>小小听写伴</Text>
        <Text style={styles.subtitle}>选择听写</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {allLessons.map((lesson) => {
          const completed = getLessonProgress(lesson.id, lesson.items.length);
          const total = lesson.items.length;

          return (
            <Pressable
              key={lesson.id}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
              onPress={() => {
                useAppStore.getState().setLesson(lesson.id);
                router.push(`/lesson/${lesson.id}`);
              }}
            >
              <Text style={styles.lessonLabel}>{lesson.label}</Text>
              <Text style={styles.lessonName}>{lesson.lessonName}</Text>
              <Text style={styles.date}>{lesson.date}</Text>

              {/* Progress bar */}
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: total > 0 ? `${(completed / total) * 100}%` : '0%' },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {completed}/{total} 个词
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        style={styles.parentBtn}
        onPress={() => router.push('/parent')}
      >
        <Text style={styles.parentBtnText}>家长</Text>
      </Pressable>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lessonLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  lessonName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  date: {
    fontSize: 13,
    color: colors.textLight,
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.correct,
  },
  progressText: {
    fontSize: 12,
    color: colors.textLight,
  },
  parentBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  parentBtnText: {
    fontSize: 16,
    color: colors.textLight,
  },
});
