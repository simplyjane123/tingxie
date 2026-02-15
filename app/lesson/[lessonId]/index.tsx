import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import ToneCurve from '../../../components/pinyin/ToneCurve';
import SpeakButton from '../../../components/audio/SpeakButton';
import { getLessonById } from '../../../data/lessons';
import { useAppStore } from '../../../store/useAppStore';
import { encodeLessonToUrl } from '../../../utils/shareLesson';
import { colors, spacing, radius, typography, toneColor } from '../../../constants/theme';

export default function WordMapScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const customLessons = useAppStore((s) => s.customLessons);
  const lesson = getLessonById(lessonId ?? '', customLessons);
  const progress = useAppStore((s) => s.progress);
  const [copied, setCopied] = useState(false);
  const isCustom = lesson?.id.startsWith('custom-') ?? false;

  const handleShare = async () => {
    if (!lesson) return;
    const url = encodeLessonToUrl(lesson);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Share Link', url);
    }
  };

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
        <Pressable onPress={() => router.replace('/')} style={styles.backBtn}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.title}>{lesson.label}</Text>
        <Text style={styles.subtitle}>{lesson.lessonName} · {lesson.date}</Text>

        {/* Test Mode Button */}
        <Pressable
          onPress={() => router.push(`/lesson/${lessonId}/test`)}
          style={({ pressed }) => [styles.testModeBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.testModeIcon}>📝</Text>
          <Text style={styles.testModeText}>听写测试模式</Text>
        </Pressable>

        {/* Share Button - custom lessons only */}
        {isCustom && (
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.shareBtnText}>
              {copied ? 'Link Copied!' : 'Share Lesson'}
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {lesson.items.map((item, index) => {
          const p = progress[item.id];
          const writingDone = p?.writingComplete ?? false;
          const pinyinStage = p?.pinyinStage ?? 0;
          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.itemCard,
                item.type === 'pinyin' && item.syllables.length > 1 && styles.itemCardWide,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => {
                useAppStore.getState().setItemIndex(index);
                // Pinyin items go directly to pinyin screen (听一听), hanzi items go to writing
                const track = item.type === 'pinyin' ? 'pinyin' : 'writing';
                router.push(`/lesson/${lessonId}/item/${index}/${track}`);
              }}
            >
              {/* For pinyin items: show tone curves + pinyin */}
              {item.type === 'pinyin' && (
                <View style={styles.pinyinDisplay}>
                  <View style={styles.toneCurvesRow}>
                    {item.syllables.map((syl, i) => (
                      <ToneCurve
                        key={i}
                        tone={syl.tone as 1 | 2 | 3 | 4}
                        size={40}
                        animate={false}
                      />
                    ))}
                  </View>
                  <View style={styles.syllablesRow}>
                    {item.syllables.map((syl, i) => (
                      <Text
                        key={i}
                        style={[styles.syllableText, { color: toneColor(syl.tone) }]}
                      >
                        {syl.pinyin}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* For hanzi items: show character + pinyin below */}
              {item.type === 'hanzi' && (
                <>
                  <Text style={styles.itemChar}>{item.characters}</Text>
                  <Text style={[styles.itemPinyin, { color: toneColor(item.syllables[0]?.tone ?? 0) }]}>
                    {item.pinyin}
                  </Text>
                </>
              )}

              {/* Progress indicator and speaker */}
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
                <SpeakButton text={item.characters || item.pinyin} size="tiny" />
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
  testModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  testModeIcon: {
    fontSize: 24,
  },
  testModeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
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
  itemCardWide: {
    width: 140,
  },
  pinyinDisplay: {
    alignItems: 'center',
    gap: 2,
  },
  toneCurvesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  syllablesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  syllableText: {
    fontSize: 22,
    fontWeight: '700',
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
