import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { parsePinyinString } from '../../utils/pinyin';

export default function QuestionsScreen() {
  const { ocrText, lessonId } = useLocalSearchParams<{ ocrText: string; lessonId: string }>();
  const [hasPinyin, setHasPinyin] = useState<boolean | null>(null);
  const [wantPinyin, setWantPinyin] = useState<boolean | null>(null);
  const [wantEnglish, setWantEnglish] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (hasPinyin === null || wantPinyin === null || wantEnglish === null) {
      setError('Please answer all questions');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ocrText,
          hasPinyin,
          wantPinyin,
          wantEnglish,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const { items: rawItems } = await response.json();

      // Transform Claude's output to SpellingItem format
      const items = rawItems.map((item: any, index: number) => {
        const pinyin = wantPinyin ? (item.pinyin || '') : '';
        const syllables = wantPinyin ? parsePinyinString(pinyin) : [];
        const type = syllables.length === 1 ? 'hanzi' : 'pinyin';

        return {
          id: `${lessonId}-${index}`,
          lessonId,
          type,
          pinyin,
          syllables,
          characters: item.characters || '',
          english: wantEnglish ? (item.english || '') : '',
        };
      });

      if (items.length === 0) {
        setError('No words detected. Try adjusting your answers or use a clearer image.');
        setLoading(false);
        return;
      }

      // Navigate to review screen with AI-parsed data
      router.push({
        pathname: '/upload/review',
        params: {
          lessonId,
          items: JSON.stringify(items),
          ocrText,
        },
      });
    } catch (e: any) {
      console.error('AI processing error:', e);
      setError(e.message || 'AI processing failed. Please try again.');
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
        <Text style={styles.title}>AI Processing</Text>
        <Text style={styles.subtitle}>Help the AI understand your list</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* OCR Preview */}
        <View style={styles.ocrPreview}>
          <Text style={styles.sectionTitle}>Detected Text:</Text>
          <ScrollView style={styles.ocrBox} nestedScrollEnabled>
            <Text style={styles.ocrText}>{ocrText}</Text>
          </ScrollView>
        </View>

        {/* Question 1: Does the uploaded image contain pinyin? */}
        <View style={styles.questionSection}>
          <Text style={styles.questionTitle}>1. Does the uploaded list contain Hanyu Pinyin?</Text>
          <Text style={styles.questionHint}>
            Look at the text above. If you see pinyin (e.g., wǒ, nǐ, tā) next to Chinese characters, select YES.
          </Text>

          <View style={styles.optionsRow}>
            <Pressable
              style={[styles.optionBtn, hasPinyin === true && styles.optionBtnSelected]}
              onPress={() => setHasPinyin(true)}
            >
              <Text style={[styles.optionText, hasPinyin === true && styles.optionTextSelected]}>
                ✓ Yes, has pinyin
              </Text>
            </Pressable>

            <Pressable
              style={[styles.optionBtn, hasPinyin === false && styles.optionBtnSelected]}
              onPress={() => setHasPinyin(false)}
            >
              <Text style={[styles.optionText, hasPinyin === false && styles.optionTextSelected]}>
                ✗ No pinyin shown
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Question 2: Should generated list include pinyin? */}
        <View style={styles.questionSection}>
          <Text style={styles.questionTitle}>2. Should the generated list include Hanyu Pinyin?</Text>
          <Text style={styles.questionHint}>
            Do you want pinyin in your final lesson? (If the uploaded list has pinyin, we'll use it. Otherwise, AI will infer it.)
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

        {/* Question 3: Should generated list include English? */}
        <View style={styles.questionSection}>
          <Text style={styles.questionTitle}>3. Should the generated list include English translations?</Text>
          <Text style={styles.questionHint}>
            Do you want English meanings in your final lesson? (AI will extract them if present in the image.)
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
            <Text style={styles.submitBtnText}>Process with AI 🤖</Text>
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
