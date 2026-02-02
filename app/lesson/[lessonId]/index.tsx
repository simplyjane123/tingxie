import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import { getLessonById } from '../../../data/lessons';
import { useAppStore } from '../../../store/useAppStore';
import { colors, spacing, radius, typography, toneColor } from '../../../constants/theme';

export default function WordMapScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const lesson = getLessonById(lessonId ?? '');
  const progress = useAppStore((s) => s.progress);

  if (!lesson) {
    return (
      <ScreenWrapper>
        <Text style={styles.errorText}>找不到课程</Text>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.title}>{lesson.label}</Text>
        <Text style={styles.subtitle}>{lesson.lessonName} · {lesson.date}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {lesson.items.map((item, index) => {
          const p = progress[item.id];
          const writingDone = p?.writingComplete ?? false;
          const pinyinStage = p?.pinyinStage ?? 0;
          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.itemCard, pressed && { opacity: 0.8 }]}
              onPress={() => {
                useAppStore.getState().setItemIndex(index);
                const track = item.type === 'pinyin' ? 'pinyin' : 'writing';
                router.push(`/lesson/${lessonId}/item/${index}/${track}`);
              }}
            >
              {/* Show character or pinyin as main display */}
              <Text style={styles.itemChar}>
                {item.type === 'hanzi' ? item.characters : item.pinyin}
              </Text>
              {item.type === 'hanzi' && (
                <Text style={[styles.itemPinyin, { color: toneColor(item.syllables[0]?.tone ?? 0) }]}>
                  {item.pinyin}
                </Text>
              )}

              {/* Progress indicator — one dot per item type */}
              <View style={styles.indicators}>
                {item.type === 'hanzi' ? (
                  <View style={[styles.dot, writingDone && { backgroundColor: colors.correct }]}>
                    <Text style={styles.dotText}>写</Text>
                  </View>
                ) : (
                  <View style={[styles.dot, pinyinStage >= 4 && { backgroundColor: colors.correct }]}>
                    <Text style={styles.dotText}>拼</Text>
                  </View>
                )}
              </View>
            </Pressable>
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
  subtitle: {
    fontSize: typography.caption.fontSize,
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
  itemCard: {
    width: 100,
    height: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    padding: spacing.sm,
  },
  itemChar: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  itemPinyin: {
    fontSize: 14,
    fontWeight: '600',
  },
  indicators: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  errorText: {
    fontSize: 20,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 100,
  },
});
