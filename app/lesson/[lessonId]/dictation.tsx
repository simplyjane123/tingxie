import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, PanResponder, GestureResponderEvent } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import MiziGrid from '../../../components/writing/MiziGrid';
import CelebrationRoll from '../../../components/feedback/CelebrationRoll';
import { getLessonById } from '../../../data/lessons';
import { useAppStore } from '../../../store/useAppStore';
import { speakChinese } from '../../../utils/speech';
import { colors, spacing, radius } from '../../../constants/theme';
import { WRITING_GRID_SIZE } from '../../../constants/layout';

type Phase = 'speaking' | 'writing' | 'complete';

export default function DictationScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const customLessons = useAppStore((s) => s.customLessons);
  const lesson = getLessonById(lessonId ?? '', customLessons);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('speaking');
  const [completedWords, setCompletedWords] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [drawnPaths, setDrawnPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  const items = lesson?.items ?? [];
  const currentItem = items[currentIndex];
  const totalItems = items.length;

  // PanResponder for free drawing
  const getXY = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    return { x: locationX, y: locationY };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { x, y } = getXY(e);
        pointsRef.current = [{ x, y }];
        setCurrentPath(`M${x},${y}`);
      },
      onPanResponderMove: (e) => {
        const { x, y } = getXY(e);
        pointsRef.current.push({ x, y });
        const pathStr = pointsRef.current.map((p, i) =>
          i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`
        ).join(' ');
        setCurrentPath(pathStr);
      },
      onPanResponderRelease: () => {
        if (pointsRef.current.length > 1) {
          const pathStr = pointsRef.current.map((p, i) =>
            i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`
          ).join(' ');
          setDrawnPaths((prev) => [...prev, pathStr]);
        }
        setCurrentPath('');
        pointsRef.current = [];
      },
    })
  ).current;

  // Speak the current word
  const speakCurrentWord = useCallback(() => {
    if (!currentItem) return;
    const text = currentItem.characters || currentItem.pinyin;
    setPhase('speaking');
    speakChinese(text, 0.65, () => {
      setPhase('writing');
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

  const handleClear = () => {
    setDrawnPaths([]);
    setCurrentPath('');
  };

  const handleNext = () => {
    if (!currentItem) return;

    // Add current word to completed list
    const wordText = currentItem.characters || currentItem.pinyin;
    setCompletedWords((prev) => [...prev, wordText]);

    // Clear the canvas
    setDrawnPaths([]);
    setCurrentPath('');

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
      </View>

      <View style={styles.body}>
        {/* Completed words - top left */}
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
            {/* Word counter and speaker */}
            <View style={styles.topRow}>
              <Text style={styles.wordCounter}>
                第 {currentIndex + 1} / {totalItems} 题
              </Text>
              {phase === 'speaking' && (
                <Text style={styles.listeningLabel}>🔊 Listening...</Text>
              )}
            </View>

            {/* Writing canvas */}
            <View style={styles.canvasContainer}>
              <View
                style={[styles.canvas, { width: WRITING_GRID_SIZE, height: WRITING_GRID_SIZE }]}
                {...panResponder.panHandlers}
              >
                <MiziGrid size={WRITING_GRID_SIZE} />
                <Svg
                  width={WRITING_GRID_SIZE}
                  height={WRITING_GRID_SIZE}
                  style={StyleSheet.absoluteFill}
                >
                  {drawnPaths.map((d, i) => (
                    <Path
                      key={i}
                      d={d}
                      stroke={colors.text}
                      strokeWidth={4}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {currentPath ? (
                    <Path
                      d={currentPath}
                      stroke={colors.text}
                      strokeWidth={4}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                </Svg>
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
                style={({ pressed }) => [styles.smallBtn, styles.clearBtn, pressed && { opacity: 0.8 }]}
                onPress={handleClear}
              >
                <Text style={styles.smallBtnText}>🗑️ Clear</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.8 }]}
                onPress={handleNext}
              >
                <Text style={styles.nextBtnText}>
                  {currentIndex + 1 < totalItems ? 'Next ➡️' : 'Done ✅'}
                </Text>
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
  listeningLabel: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  canvasContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  smallBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  clearBtn: {
    borderColor: colors.border,
  },
  smallBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  nextBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
