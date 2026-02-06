import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenWrapper from '../../../../../components/common/ScreenWrapper';
import { getLessonById } from '../../../../../data/lessons';
import { useAppStore } from '../../../../../store/useAppStore';
import { colors, spacing, radius, typography, toneColor } from '../../../../../constants/theme';

export default function TrackPickerScreen() {
  const { lessonId, itemIndex } = useLocalSearchParams<{ lessonId: string; itemIndex: string }>();
  const lesson = getLessonById(lessonId ?? '');
  const idx = parseInt(itemIndex ?? '0', 10);
  const item = lesson?.items[idx];
  const progress = useAppStore((s) => item ? s.progress[item.id] : undefined);

  if (!lesson || !item) {
    return (
      <ScreenWrapper>
        <Text style={styles.errorText}>找不到词语</Text>
      </ScreenWrapper>
    );
  }

  // Show pinyin track for all items that have syllables (all words have pinyin)
  const hasPinyin = item.syllables && item.syllables.length > 0;
  const hasCharacters = !!item.characters;
  const writingDone = progress?.writingComplete ?? false;
  const pinyinStage = progress?.pinyinStage ?? 0;

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
      </View>

      {/* Word display */}
      <View style={styles.wordArea}>
        {item.characters && (
          <Text style={styles.character}>{item.characters}</Text>
        )}
        <Text style={[styles.pinyin, { color: toneColor(item.syllables[0]?.tone ?? 0) }]}>
          {item.pinyin}
        </Text>
        {item.english && (
          <Text style={styles.english}>{item.english}</Text>
        )}
      </View>

      {/* Track selection */}
      <View style={styles.tracks}>
        <Text style={styles.chooseLabel}>选择练习</Text>

        {hasCharacters && (
          <Pressable
            style={({ pressed }) => [styles.trackCard, pressed && { opacity: 0.85 }]}
            onPress={() => router.push(`/lesson/${lessonId}/item/${itemIndex}/writing`)}
          >
            <Text style={styles.trackIcon}>✍️</Text>
            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle}>写字</Text>
              <Text style={styles.trackDesc}>笔画练习</Text>
            </View>
            {writingDone && <Text style={styles.checkMark}>✓</Text>}
          </Pressable>
        )}

        {hasPinyin && (
          <Pressable
            style={({ pressed }) => [styles.trackCard, pressed && { opacity: 0.85 }]}
            onPress={() => router.push(`/lesson/${lessonId}/item/${itemIndex}/pinyin`)}
          >
            <Text style={styles.trackIcon}>🔤</Text>
            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle}>拼音</Text>
              <Text style={styles.trackDesc}>
                {pinyinStage === 0 ? '开始学习' : `第 ${pinyinStage}/4 阶段`}
              </Text>
            </View>
            {pinyinStage >= 4 && <Text style={styles.checkMark}>✓</Text>}
          </Pressable>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
  },
  backBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  backText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '500',
  },
  wordArea: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  character: {
    fontSize: typography.character.fontSize,
    fontWeight: typography.character.fontWeight,
    color: colors.text,
  },
  pinyin: {
    fontSize: 36,
    fontWeight: '700',
  },
  english: {
    fontSize: typography.caption.fontSize,
    color: colors.textLight,
  },
  tracks: {
    flex: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  chooseLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  trackIcon: {
    fontSize: 36,
  },
  trackInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  trackTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  trackDesc: {
    fontSize: 15,
    color: colors.textLight,
  },
  checkMark: {
    fontSize: 28,
    color: colors.correct,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 20,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 100,
  },
});
