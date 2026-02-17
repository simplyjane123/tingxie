import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import CelebrationRoll from '../../../components/feedback/CelebrationRoll';
import { getLessonById } from '../../../data/lessons';
import { useAppStore } from '../../../store/useAppStore';
import { speakChinese } from '../../../utils/speech';
import { colors, spacing, radius } from '../../../constants/theme';

type Phase = 'speaking' | 'waiting' | 'complete';

export default function DictationScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const customLessons = useAppStore((s) => s.customLessons);
  const lesson = getLessonById(lessonId ?? '', customLessons);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('speaking');
  const [completedWords, setCompletedWords] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const items = lesson?.items ?? [];
  const currentItem = items[currentIndex];
  const totalItems = items.length;

  // Speak the current word
  const speakCurrentWord = useCallback(() => {
    if (!currentItem) return;
    const text = currentItem.characters || currentItem.pinyin;
    setPhase('speaking');
    speakChinese(text, 0.65, () => {
      setPhase('waiting');
    });
  }, [currentItem]);

  // Auto-speak on mount and when index changes
  useEffect(() => {
    if (currentItem && phase !== 'complete') {
      speakCurrentWord();
    }
  }, [currentIndex]);

  const handleRepeat = () => {
    if (!currentItem) return;
    const text = currentItem.characters || currentItem.pinyin;
    speakChinese(text, 0.65);
  };

  const handleNext = () => {
    if (!currentItem) return;

    // Add current word to completed list
    const wordText = currentItem.characters || currentItem.pinyin;
    setCompletedWords((prev) => [...prev, wordText]);

    if (currentIndex + 1 < totalItems) {
      // Move to next word after a brief pause
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 1000);
    } else {
      // All done!
      setPhase('complete');
      setShowCelebration(true);
    }
  };

  const handleCelebrationDone = () => {
    setShowCelebration(false);
  };

  if (!lesson) {
    return (
      <ScreenWrapper>
        <Text style={styles.errorText}>Lesson not found</Text>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.title}>{lesson.label}</Text>
        <Text style={styles.subtitle}>Unguided Dictation</Text>
      </View>

      <View style={styles.body}>
        {/* Completed words - top left */}
        <ScrollView
          ref={scrollRef}
          style={styles.completedList}
          contentContainerStyle={styles.completedContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {completedWords.map((word, i) => (
            <Text key={i} style={styles.completedWord}>
              {i + 1}. {word}
            </Text>
          ))}
        </ScrollView>

        {/* Center area */}
        <View style={styles.centerArea}>
          {phase === 'complete' ? (
            <View style={styles.doneContainer}>
              <Text style={styles.doneEmoji}>🎉</Text>
              <Text style={styles.doneText}>All done!</Text>
              <Text style={styles.doneSubtext}>
                {totalItems} words completed
              </Text>
              <Pressable
                style={styles.returnBtn}
                onPress={() => router.back()}
              >
                <Text style={styles.returnBtnText}>Back to Lesson</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.wordCounter}>
                第 {currentIndex + 1} / {totalItems} 题
              </Text>

              {phase === 'speaking' ? (
                <Text style={styles.speakerIcon}>🔊</Text>
              ) : (
                <Text style={styles.speakerIcon}>✏️</Text>
              )}

              <Text style={styles.instruction}>
                {phase === 'speaking'
                  ? 'Listening...'
                  : 'Write the word, then tap Next'}
              </Text>
            </>
          )}
        </View>

        {/* Bottom buttons */}
        {phase !== 'complete' && (
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [styles.repeatBtn, pressed && { opacity: 0.8 }]}
              onPress={handleRepeat}
            >
              <Text style={styles.repeatBtnText}>🔊 Repeat</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.8 }]}
              onPress={handleNext}
            >
              <Text style={styles.nextBtnText}>
                {currentIndex + 1 < totalItems ? '➡️ Next' : '✅ Done'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Celebration overlay */}
      <CelebrationRoll visible={showCelebration} onDone={handleCelebrationDone} />
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
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  completedList: {
    maxHeight: 150,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  completedContent: {
    gap: 4,
  },
  completedWord: {
    fontSize: 16,
    color: colors.textLight,
    fontWeight: '500',
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  wordCounter: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  speakerIcon: {
    fontSize: 64,
  },
  instruction: {
    fontSize: 16,
    color: colors.textLight,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  repeatBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  repeatBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  nextBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.correct,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  nextBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doneContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  doneEmoji: {
    fontSize: 64,
  },
  doneText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.correct,
  },
  doneSubtext: {
    fontSize: 16,
    color: colors.textLight,
  },
  returnBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  returnBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 20,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 100,
  },
});
