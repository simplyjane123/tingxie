import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenWrapper from '../components/common/ScreenWrapper';
import BigButton from '../components/common/BigButton';
import { useAppStore } from '../store/useAppStore';
import { decodeLessonFromUrl } from '../utils/shareLesson';
import { colors, spacing, radius, typography, toneColor } from '../constants/theme';

export default function ShareScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const addCustomLesson = useAppStore((s) => s.addCustomLesson);
  const customLessons = useAppStore((s) => s.customLessons);
  const [saved, setSaved] = useState(false);

  const result = useMemo(() => {
    if (!data) return { error: 'No lesson data found in link.', lesson: null };
    try {
      return { lesson: decodeLessonFromUrl(data), error: null };
    } catch (e: any) {
      return { error: e.message || 'Invalid lesson data.', lesson: null };
    }
  }, [data]);

  const isDuplicate = useMemo(() => {
    if (!result.lesson) return false;
    return customLessons.some(
      (l) =>
        l.label === result.lesson!.label &&
        l.items.length === result.lesson!.items.length
    );
  }, [result.lesson, customLessons]);

  const handleSave = () => {
    if (!result.lesson) return;

    if (isDuplicate) {
      Alert.alert(
        'Lesson Already Exists',
        'A lesson with the same name and word count already exists. Save anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save Anyway',
            onPress: () => {
              addCustomLesson(result.lesson!);
              setSaved(true);
            },
          },
        ]
      );
      return;
    }

    addCustomLesson(result.lesson);
    setSaved(true);
  };

  // Error state
  if (result.error) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>Cannot Open Lesson</Text>
          <Text style={styles.errorMessage}>{result.error}</Text>
          <BigButton label="Go Home" onPress={() => router.replace('/')} />
        </View>
      </ScreenWrapper>
    );
  }

  // Saved state
  if (saved) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <Text style={styles.successIcon}>OK</Text>
          <Text style={styles.successTitle}>Lesson Saved!</Text>
          <Text style={styles.successMessage}>
            "{result.lesson!.label}" has been added to your list.
          </Text>
          <BigButton
            label="Start Learning"
            onPress={() => router.replace('/')}
            color={colors.correct}
          />
        </View>
      </ScreenWrapper>
    );
  }

  // Preview state
  const lesson = result.lesson!;
  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.title}>Shared Lesson</Text>
        <Text style={styles.subtitle}>Someone shared a lesson with you</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Lesson info card */}
        <View style={styles.infoCard}>
          <Text style={styles.lessonLabel}>{lesson.label}</Text>
          <Text style={styles.lessonName}>{lesson.lessonName}</Text>
          {lesson.school && <Text style={styles.meta}>{lesson.school}</Text>}
          {lesson.grade && <Text style={styles.meta}>{lesson.grade}</Text>}
          <Text style={styles.meta}>{lesson.date}</Text>
          <Text style={styles.wordCount}>{lesson.items.length} words</Text>
        </View>

        {/* Word preview list */}
        <Text style={styles.sectionTitle}>Words</Text>
        {lesson.items.map((item, i) => (
          <View key={i} style={styles.wordRow}>
            <Text style={styles.wordNumber}>{i + 1}</Text>
            <View style={styles.wordInfo}>
              {item.characters && (
                <Text style={styles.wordChar}>{item.characters}</Text>
              )}
              <Text style={[styles.wordPinyin, { color: toneColor(item.syllables[0]?.tone ?? 0) }]}>
                {item.pinyin}
              </Text>
            </View>
          </View>
        ))}

        {isDuplicate && (
          <Text style={styles.duplicateWarning}>
            A similar lesson already exists in your list.
          </Text>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <BigButton
          label="Save to My List"
          onPress={handleSave}
          color={colors.correct}
        />
        <Pressable onPress={() => router.replace('/')} style={styles.skipBtn}>
          <Text style={styles.skipText}>No Thanks</Text>
        </Pressable>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  errorIcon: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.wrong,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.wrong + '20',
    textAlign: 'center',
    lineHeight: 72,
    overflow: 'hidden',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
  },
  successIcon: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.correct,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.correct + '20',
    textAlign: 'center',
    lineHeight: 72,
    overflow: 'hidden',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  successMessage: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lessonLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  lessonName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  meta: {
    fontSize: 14,
    color: colors.textLight,
  },
  wordCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  wordNumber: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
    width: 24,
    textAlign: 'center',
  },
  wordInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wordChar: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  wordPinyin: {
    fontSize: 16,
    fontWeight: '600',
  },
  duplicateWarning: {
    fontSize: 14,
    color: colors.wrong,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.wrong + '10',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  actions: {
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: 16,
    color: colors.textLight,
  },
});
