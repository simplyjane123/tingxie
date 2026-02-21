import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import StrokeTracer from '../../../components/writing/StrokeTracer';
import CelebrationRoll from '../../../components/feedback/CelebrationRoll';
import { getLessonById } from '../../../data/lessons';
import { useAppStore } from '../../../store/useAppStore';
import { speakChinese } from '../../../utils/speech';
import { loadCharacterData, CharacterData } from '../../../utils/characterLoader';
import { colors, spacing, radius } from '../../../constants/theme';

type Phase = 'writing' | 'complete';

export default function GuidedDictationScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const customLessons = useAppStore((s) => s.customLessons);
  const lesson = getLessonById(lessonId ?? '', customLessons);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('writing');
  const [completedWords, setCompletedWords] = useState<string[]>([]);
  const [writtenChars, setWrittenChars] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [charData, setCharData] = useState<CharacterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracerKey, setTracerKey] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const afterCelebrationRef = useRef<(() => void) | null>(null);

  const items = lesson?.items ?? [];
  const currentItem = items[currentIndex];
  const totalItems = items.length;
  const characters = currentItem?.characters?.split('') ?? [];
  const currentChar = characters[charIdx] ?? '';

  // Load character stroke data when character changes
  useEffect(() => {
    if (!currentChar) return;
    setCharData(null);
    setLoading(true);
    loadCharacterData(currentChar).then((data) => {
      setCharData(data);
      setLoading(false);
    });
  }, [currentChar, tracerKey]);

  // Try to speak the current word (best-effort — browsers may block auto-play)
  useEffect(() => {
    if (!currentItem || phase === 'complete') return;
    const text = currentItem.characters || currentItem.pinyin;
    speakChinese(text, 0.65);
  }, [currentIndex]);

  const handleRepeat = () => {
    if (!currentItem) return;
    const text = currentItem.characters || currentItem.pinyin;
    speakChinese(text, 0.65);
  };

  // Called when StrokeTracer completes a character (all strokes correct)
  const handleCharComplete = () => {
    const justWritten = characters[charIdx];
    const newWritten = [...writtenChars, justWritten];
    setWrittenChars(newWritten);

    if (charIdx + 1 < characters.length) {
      // More characters in this word
      setCharIdx(charIdx + 1);
      setTracerKey((prev) => prev + 1);
    } else {
      // Word/phrase complete — celebrate!
      const wordText = currentItem.characters || currentItem.pinyin;
      setCompletedWords((prev) => [...prev, wordText]);
      setWrittenChars([]);
      setCharIdx(0);
      setTracerKey((prev) => prev + 1);

      if (currentIndex + 1 < totalItems) {
        afterCelebrationRef.current = () => {
          setCurrentIndex((prev) => prev + 1);
        };
      } else {
        afterCelebrationRef.current = () => {
          setPhase('complete');
        };
      }
      setShowCelebration(true);
    }
  };

  // Skip: skip the entire word/phrase and move to the next one (no celebration)
  const handleSkip = () => {
    const wordText = currentItem.characters || currentItem.pinyin;
    setCompletedWords((prev) => [...prev, wordText]);
    setWrittenChars([]);
    setCharIdx(0);
    setTracerKey((prev) => prev + 1);

    if (currentIndex + 1 < totalItems) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setPhase('complete');
    }
  };

  const handleCelebrationDone = () => {
    setShowCelebration(false);
    const next = afterCelebrationRef.current;
    afterCelebrationRef.current = null;
    next?.();
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
      </View>

      <View style={styles.body}>
        {/* Completed words - top area */}
        {completedWords.length > 0 && (
          <ScrollView
            ref={scrollRef}
            style={styles.completedList}
            contentContainerStyle={styles.completedContent}
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {completedWords.map((word, i) => (
              <View key={i} style={styles.completedChip}>
                <Text style={styles.completedWord}>{word}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Center area */}
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
            {/* Word counter */}
            <View style={styles.topRow}>
              <Text style={styles.wordCounter}>
                第 {currentIndex + 1} / {totalItems} 题
              </Text>
              {characters.length > 1 && (
                <Text style={styles.charCounter}>
                  字 {charIdx + 1}/{characters.length}
                </Text>
              )}
            </View>

            {/* Writing area: written chars + StrokeTracer side by side */}
            <View style={styles.writingRow}>
              {/* Previously written characters for this word */}
              {writtenChars.length > 0 && (
                <View style={styles.writtenCharsRow}>
                  {writtenChars.map((ch, i) => (
                    <View key={`${tracerKey}-${i}`} style={styles.writtenCharBox}>
                      <Text style={styles.writtenCharText}>{ch}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Guided StrokeTracer */}
              <View style={styles.tracerContainer}>
                {loading ? (
                  <Text style={styles.loadingText}>加载中...</Text>
                ) : (
                  <StrokeTracer
                    key={tracerKey}
                    characterData={charData}
                    character={currentChar}
                    suppressCelebration
                    onComplete={handleCharComplete}
                  />
                )}
              </View>
            </View>

            {/* Bottom buttons */}
            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.8 }]}
                onPress={handleRepeat}
              >
                <Text style={styles.smallBtnText}>🔊 Repeat</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.8 }]}
                onPress={handleSkip}
              >
                <Text style={styles.skipBtnText}>Skip ⏭</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Celebration overlay */}
      <CelebrationRoll visible={showCelebration} onDone={handleCelebrationDone} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
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
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  completedList: {
    maxHeight: 44,
    marginBottom: spacing.sm,
  },
  completedContent: {
    gap: 8,
    alignItems: 'center',
  },
  completedChip: {
    backgroundColor: colors.correct + '20',
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.correct + '40',
  },
  completedWord: {
    fontSize: 16,
    color: colors.correct,
    fontWeight: '600',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  wordCounter: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  charCounter: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
  },
  writingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  writtenCharsRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  writtenCharBox: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.correct + '12',
    borderWidth: 1.5,
    borderColor: colors.correct + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  writtenCharText: {
    fontSize: 36,
    color: colors.text,
    fontWeight: '400',
  },
  tracerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: colors.textLight,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  smallBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  skipBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.textLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textLight,
  },
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
