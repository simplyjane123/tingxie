import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { parseOcrWithLessons, formatMultipleLessons } from '../../utils/simpleParser';

export default function QuestionsScreen() {
  const { ocrText, lessonId } = useLocalSearchParams<{ ocrText: string; lessonId: string }>();
  const [wantPinyin, setWantPinyin] = useState<boolean | null>(null);
  const [wantEnglish, setWantEnglish] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (wantPinyin === null || wantEnglish === null) {
      setError('Please answer all questions');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse OCR text to extract lessons
      const lessonGroups = parseOcrWithLessons(ocrText);

      if (lessonGroups.length === 0) {
        setError('No lesson headers detected (e.g., "听写 1", "Lesson 1"). Please ensure your image contains lesson labels.');
        setLoading(false);
        return;
      }

      // Check if this was auto-created (no real lesson headers)
      if (lessonGroups.length === 1 && lessonGroups[0].lessonName === 'Lesson 1') {
        const hasExplicitHeader = /(?:听写|ting\s*xie|lesson)\s*(\d+|[一二三四五六七八九十]+)/i.test(ocrText);
        if (!hasExplicitHeader) {
          setError('No lesson headers detected. Please include lesson labels like "听写 1" or "Lesson 1" in your image.');
          setLoading(false);
          return;
        }
      }

      // Format multiple lessons
      const formattedLessons = formatMultipleLessons(lessonGroups, wantPinyin, wantEnglish, lessonId);

      // For now, just take the first lesson and navigate to review
      // TODO: Add multi-lesson support in the UI
      if (formattedLessons.length === 0 || formattedLessons[0].items.length === 0) {
        setError('No words detected in lessons. Try using a clearer image.');
        setLoading(false);
        return;
      }

      // Navigate to review screen with first lesson
      router.push({
        pathname: '/upload/review',
        params: {
          lessonId: formattedLessons[0].lessonId,
          items: JSON.stringify(formattedLessons[0].items),
          ocrText,
        },
      });
    } catch (e: any) {
      console.error('Parsing error:', e);
      setError(e.message || 'Processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.title}>Lesson Setup</Text>
        <Text style={styles.subtitle}>Customize your lesson</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* OCR Preview */}
        <View style={styles.ocrPreview}>
          <Text style={styles.sectionTitle}>Detected Text:</Text>
          <ScrollView style={styles.ocrBox} nestedScrollEnabled>
            <Text style={styles.ocrText}>{ocrText}</Text>
          </ScrollView>
        </View>

        {/* Question 1: Should generated list include pinyin? */}
        <View style={styles.questionSection}>
          <Text style={styles.questionTitle}>1. Should the generated list include Hanyu Pinyin?</Text>
          <Text style={styles.questionHint}>
            Pinyin will be extracted from the image if present.
          </Text>

          <View style={styles.optionsRow}>
            <Pressable
              style={[styles.optionBtn, wantPinyin === true && styles.optionBtnSelected]}
              onPress={() => setWantPinyin(true)}
            >
              <Text style={[styles.optionText, wantPinyin === true && styles.optionTextSelected]}>
                ✓ Include pinyin
              </Text>
            </Pressable>

            <Pressable
              style={[styles.optionBtn, wantPinyin === false && styles.optionBtnSelected]}
              onPress={() => setWantPinyin(false)}
            >
              <Text style={[styles.optionText, wantPinyin === false && styles.optionTextSelected]}>
                ✗ No pinyin needed
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Question 2: Should generated list include English? */}
        <View style={styles.questionSection}>
          <Text style={styles.questionTitle}>2. Should the generated list include English translations?</Text>
          <Text style={styles.questionHint}>
            English meanings will be extracted if present in the image.
          </Text>

          <View style={styles.optionsRow}>
            <Pressable
              style={[styles.optionBtn, wantEnglish === true && styles.optionBtnSelected]}
              onPress={() => setWantEnglish(true)}
            >
              <Text style={[styles.optionText, wantEnglish === true && styles.optionTextSelected]}>
                ✓ Include English
              </Text>
            </Pressable>

            <Pressable
              style={[styles.optionBtn, wantEnglish === false && styles.optionBtnSelected]}
              onPress={() => setWantEnglish(false)}
            >
              <Text style={[styles.optionText, wantEnglish === false && styles.optionTextSelected]}>
                ✗ No English needed
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Error message */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Submit button */}
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && { opacity: 0.8 },
            loading && { opacity: 0.6 },
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Generate Lesson ✨</Text>
          )}
        </Pressable>
      </ScrollView>
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
  },
  subtitle: {
    fontSize: typography.caption.fontSize,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  ocrPreview: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  ocrBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ocrText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  questionSection: {
    gap: spacing.sm,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  questionHint: {
    fontSize: 13,
    color: colors.textLight,
    lineHeight: 18,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  optionBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  optionBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: colors.primary,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    fontSize: 14,
    color: '#C62828',
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginTop: spacing.md,
  },
  submitBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
