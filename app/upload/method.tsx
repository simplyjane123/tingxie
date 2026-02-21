import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, spacing, radius } from '../../constants/theme';

type Method = 'manual' | 'ocr';

const SAMPLE_WORDS: Record<number, string[]> = {
  1: ['大', '小', '人', '日', '月'],
  2: ['中国', '学校', '朋友', '老师', '同学'],
  3: ['语文', '数学', '图书馆', '操场', '教室'],
  4: ['努力', '认真', '成功', '帮助', '友谊'],
  5: ['环境', '保护', '科技', '发展', '文化'],
  6: ['责任', '贡献', '传统', '继承', '创新'],
};

export default function MethodScreen() {
  const { primaryLevel } = useLocalSearchParams<{ primaryLevel: string }>();
  const level = parseInt(primaryLevel || '2', 10);
  const [selected, setSelected] = useState<Method | null>(null);

  const handleNext = () => {
    if (!selected) return;
    if (selected === 'manual') {
      router.push({
        pathname: '/upload/review',
        params: {
          lessonId: `custom-${Date.now()}`,
          items: JSON.stringify([]),
          primaryLevel,
        },
      });
    } else {
      router.push({
        pathname: '/upload/scan',
        params: { primaryLevel },
      });
    }
  };

  const sampleWords = SAMPLE_WORDS[level] || SAMPLE_WORDS[2];

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <View style={styles.stepIndicator}>
          <View style={styles.stepDotDone}><Text style={styles.stepDoneTick}>✓</Text></View>
          <View style={[styles.stepLine, styles.stepLineDone]} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={styles.stepDot} />
        </View>
        <Text style={styles.stepLabel}>Step 2 of 3  ·  P{level} selected</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Add Words</Text>
        <Text style={styles.subtitle}>How would you like to add words?</Text>

        {/* Method Cards */}
        <View style={styles.methodRow}>
          {/* Manual Entry */}
          <Pressable
            style={({ pressed }) => [
              styles.methodCard,
              selected === 'manual' && styles.methodCardSelected,
              pressed && selected !== 'manual' && { opacity: 0.75 },
            ]}
            onPress={() => setSelected('manual')}
          >
            <Text style={styles.methodIcon}>✏️</Text>
            <Text style={[styles.methodLabel, selected === 'manual' && styles.methodLabelSelected]}>
              Manual Entry
            </Text>
            <Text style={[styles.methodDesc, selected === 'manual' && styles.methodDescSelected]}>
              Type each word yourself
            </Text>
            {selected === 'manual' && (
              <View style={styles.selectedDot} />
            )}
          </Pressable>

          {/* Photo OCR */}
          <Pressable
            style={({ pressed }) => [
              styles.methodCard,
              selected === 'ocr' && styles.methodCardSelected,
              pressed && selected !== 'ocr' && { opacity: 0.75 },
            ]}
            onPress={() => setSelected('ocr')}
          >
            <Text style={styles.methodIcon}>📷</Text>
            <Text style={[styles.methodLabel, selected === 'ocr' && styles.methodLabelSelected]}>
              Photo OCR
            </Text>
            <Text style={[styles.methodDesc, selected === 'ocr' && styles.methodDescSelected]}>
              Scan a spelling list image
            </Text>
            {selected === 'ocr' && (
              <View style={styles.selectedDot} />
            )}
          </Pressable>
        </View>

        {/* Level Preview */}
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>P{level} Sample Words</Text>
          <View style={styles.previewChips}>
            {sampleWords.map((word) => (
              <View key={word} style={styles.previewChip}>
                <Text style={styles.previewChipText}>{word}</Text>
              </View>
            ))}
            <View style={styles.previewChipMore}>
              <Text style={styles.previewChipMoreText}>+ more</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Next Button */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.nextBtn, !selected && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!selected}
        >
          <Text style={styles.nextBtnText}>
            {selected === 'manual' ? 'Add Words Manually →' : selected === 'ocr' ? 'Open Camera →' : 'Next →'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 17,
    color: colors.primary,
    fontWeight: '600',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 0,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepDotDone: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.correct,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDoneTick: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: colors.border,
  },
  stepLineDone: {
    backgroundColor: colors.correct,
  },
  stepLabel: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: -spacing.md,
  },
  methodRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  methodCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  methodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '0D',
  },
  methodIcon: {
    fontSize: 36,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  methodLabelSelected: {
    color: colors.primary,
  },
  methodDesc: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 16,
  },
  methodDescSelected: {
    color: colors.primary,
  },
  selectedDot: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  // Level Preview
  previewSection: {
    gap: spacing.sm,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  previewChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewChipText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  previewChipMore: {
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  previewChipMoreText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  nextBtnDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  nextBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
