import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import SpeakButton from '../../../components/audio/SpeakButton';
import { getLessonById } from '../../../data/lessons';
import { useAppStore } from '../../../store/useAppStore';
import { colors, spacing, radius, typography, toneColor } from '../../../constants/theme';

export default function TestModeScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const customLessons = useAppStore((s) => s.customLessons);
  const lesson = getLessonById(lessonId ?? '', customLessons);

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
        <Text style={styles.title}>听写测试模式</Text>
        <Text style={styles.subtitle}>{lesson.label} · {lesson.lessonName}</Text>
        <Text style={styles.instructions}>
          For non-native speakers:{'\n'}
          1. Tap 🔊 to hear pronunciation{'\n'}
          2. Show the word/pinyin to the child{'\n'}
          3. Ask child to write what's indicated
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {lesson.items.map((item, index) => {
          // For pinyin type: show characters (child writes pinyin)
          // For hanzi type: show pinyin (child writes characters)
          const isPinyinTest = item.type === 'pinyin';

          return (
            <View key={item.id} style={styles.wordCard}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberText}>{index + 1}</Text>
              </View>

              <View style={styles.wordContent}>
                {/* Show what the tester should SAY/SHOW */}
                {isPinyinTest ? (
                  <>
                    {item.characters && (
                      <Text style={styles.character}>{item.characters}</Text>
                    )}
                    <Text style={styles.taskLabel}>让孩子写拼音</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.pinyin, { color: toneColor(item.syllables[0]?.tone ?? 0) }]}>
                      {item.pinyin}
                    </Text>
                    <Text style={styles.taskLabel}>让孩子写汉字</Text>
                  </>
                )}
                {item.english && (
                  <Text style={styles.english}>{item.english}</Text>
                )}
              </View>

              <SpeakButton
                text={item.characters || item.pinyin}
                size="small"
              />
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          共 {lesson.items.length} 个词语
        </Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: typography.caption.fontSize,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  instructions: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  wordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  wordContent: {
    flex: 1,
    gap: 4,
  },
  character: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  pinyin: {
    fontSize: 16,
    fontWeight: '600',
  },
  taskLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
    overflow: 'hidden',
  },
  english: {
    fontSize: 13,
    color: colors.textLight,
  },
  footer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 14,
    color: colors.textLight,
  },
  errorText: {
    fontSize: 20,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 100,
  },
});
