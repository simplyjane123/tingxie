import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, PanResponder, GestureResponderEvent, Platform, ActivityIndicator, Animated } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import MiziGrid from '../../../components/writing/MiziGrid';
import CelebrationRoll from '../../../components/feedback/CelebrationRoll';
import { getLessonById } from '../../../data/lessons';
import { useAppStore } from '../../../store/useAppStore';
import { speakChinese } from '../../../utils/speech';
import { recognizeImage } from '../../../utils/ocr';
import { loadCharacterData, CharacterData } from '../../../utils/characterLoader';
import { colors, spacing, radius } from '../../../constants/theme';
import { WRITING_GRID_SIZE } from '../../../constants/layout';

type Phase = 'writing' | 'complete';
type Feedback = 'correct' | 'incorrect' | null;
type ErrorPhase = 'none' | 'hint' | 'animation';

/** Extract a rough point cloud from an SVG path string (handles M, L, C via control points) */
function extractPathPoints(d: string): { x: number; y: number }[] {
  const nums = d.match(/-?[\d.]+/g)?.map(Number) ?? [];
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pts.push({ x: nums[i], y: nums[i + 1] });
  }
  return pts;
}

/** Map a point in Hanzi Writer character space (0-1024, y-up) to canvas pixel space */
function charToCanvas(x: number, y: number, gridSize: number) {
  return { x: (x / 1024) * gridSize, y: ((900 - y) / 1024) * gridSize };
}

/**
 * Find a circle that encloses the "wrong" region of the child's drawing.
 * When charData is unavailable, falls back to the centroid of drawn strokes.
 * Always returns a circle when drawn paths exist (never returns null for non-empty paths).
 */
function findErrorCircle(
  drawnPaths: string[],
  data: CharacterData | null,
  gridSize: number,
): { cx: number; cy: number; r: number } | null {
  const drawn: { x: number; y: number }[] = [];
  for (const d of drawnPaths) drawn.push(...extractPathPoints(d));
  if (drawn.length === 0) return null;

  const centroid = () => {
    const cx = drawn.reduce((s, p) => s + p.x, 0) / drawn.length;
    const cy = drawn.reduce((s, p) => s + p.y, 0) / drawn.length;
    return { cx, cy, r: gridSize * 0.28 };
  };

  if (!data || data.strokes.length === 0) return centroid();

  const correct: { x: number; y: number }[] = [];
  for (const d of data.strokes) {
    for (const p of extractPathPoints(d)) correct.push(charToCanvas(p.x, p.y, gridSize));
  }
  if (correct.length === 0) return centroid();

  // Find the drawn point furthest from any correct stroke control point
  let maxDist = 0;
  let worstPt = drawn[0];
  for (const dp of drawn) {
    let minD = Infinity;
    for (const cp of correct) {
      const dist = Math.hypot(dp.x - cp.x, dp.y - cp.y);
      if (dist < minD) minD = dist;
    }
    if (minD > maxDist) { maxDist = minD; worstPt = dp; }
  }

  // If there's a clear error region use it; otherwise fall back to centroid
  if (maxDist > gridSize * 0.05) {
    return { cx: worstPt.x, cy: worstPt.y, r: Math.max(gridSize * 0.22, maxDist * 0.55) };
  }
  return centroid();
}

/** Convert drawn SVG paths to a base64 PNG using an offscreen HTML canvas */
function canvasToBase64(paths: string[], size: number): string {
  if (Platform.OS !== 'web') return '';
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const d of paths) {
    const path = new Path2D(d);
    ctx.stroke(path);
  }
  return canvas.toDataURL('image/png');
}

export default function DictationScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const customLessons = useAppStore((s) => s.customLessons);
  const lesson = getLessonById(lessonId ?? '', customLessons);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('writing');
  const [completedWords, setCompletedWords] = useState<string[]>([]);
  const [writtenChars, setWrittenChars] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [drawnPaths, setDrawnPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Error feedback state
  const [charAttempts, setCharAttempts] = useState(0);
  const [errorPhase, setErrorPhase] = useState<ErrorPhase>('none');
  const [lastRecognized, setLastRecognized] = useState('');
  const [lastAttemptPaths, setLastAttemptPaths] = useState<string[]>([]);
  const [charData, setCharData] = useState<CharacterData | null>(null);
  const [animStrokeIdx, setAnimStrokeIdx] = useState(0);
  const [postAnimation, setPostAnimation] = useState(false);
  const [errorCircle, setErrorCircle] = useState<{ cx: number; cy: number; r: number } | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const scrollRef = useRef<ScrollView>(null);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const afterCelebrationRef = useRef<(() => void) | null>(null);

  const items = lesson?.items ?? [];
  const currentItem = items[currentIndex];
  const totalItems = items.length;
  const characters = currentItem?.characters?.split('') ?? [];
  const currentChar = characters[charIdx] ?? '';

  // Reset error state whenever the character changes
  useEffect(() => {
    setCharAttempts(0);
    setErrorPhase('none');
    setLastRecognized('');
    setLastAttemptPaths([]);
    setCharData(null);
    setAnimStrokeIdx(0);
    setPostAnimation(false);
    setErrorCircle(null);
    pulseAnim.setValue(1);
  }, [charIdx, currentIndex]);

  // Refine the error-circle with precise charData when it arrives during hint phase
  useEffect(() => {
    if (errorPhase === 'hint' && charData && lastAttemptPaths.length > 0) {
      const refined = findErrorCircle(lastAttemptPaths, charData, WRITING_GRID_SIZE);
      if (refined) setErrorCircle(refined);
    }
  }, [charData]);

  // Clear circle when leaving hint phase
  useEffect(() => {
    if (errorPhase !== 'hint') setErrorCircle(null);
  }, [errorPhase]);

  // Pulsing border animation while hint is showing
  useEffect(() => {
    if (errorPhase === 'hint') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 550, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [errorPhase]);

  // Speak hint explanation when hint phase starts
  useEffect(() => {
    if (errorPhase !== 'hint') return;
    speakChinese(`注意${currentChar}的笔画位置和方向`, 0.9);
  }, [errorPhase]);

  // Speak "看老师写" when animation phase starts
  useEffect(() => {
    if (errorPhase !== 'animation') return;
    speakChinese('看老师写', 0.9);
  }, [errorPhase]);

  // Auto-advance stroke animation (one stroke every 800 ms); speak on completion
  useEffect(() => {
    if (errorPhase !== 'animation' || !charData) return;
    if (animStrokeIdx >= charData.strokes.length) {
      speakChinese(`${currentChar}写完了`, 0.9);
      return;
    }
    const t = setTimeout(() => setAnimStrokeIdx((prev) => prev + 1), 800);
    return () => clearTimeout(t);
  }, [errorPhase, charData, animStrokeIdx]);

  // PanResponder for free drawing
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        pointsRef.current = [{ x: locationX, y: locationY }];
        setCurrentPath(`M${locationX},${locationY}`);
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        pointsRef.current.push({ x: locationX, y: locationY });
        const pathStr = pointsRef.current
          .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
          .join(' ');
        setCurrentPath(pathStr);
      },
      onPanResponderRelease: () => {
        if (pointsRef.current.length > 1) {
          const pathStr = pointsRef.current
            .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
            .join(' ');
          setDrawnPaths((prev) => [...prev, pathStr]);
        }
        setCurrentPath('');
        pointsRef.current = [];
      },
    })
  ).current;

  // Speak current word when it changes
  useEffect(() => {
    if (!currentItem || phase === 'complete') return;
    const text = currentItem.characters || currentItem.pinyin;
    speakChinese(text, 0.65);
  }, [currentIndex]);

  const handleRepeat = () => {
    if (!currentItem) return;
    speakChinese(currentItem.characters || currentItem.pinyin, 0.65);
  };

  const handleClear = () => {
    setDrawnPaths([]);
    setCurrentPath('');
  };

  // Advance to next character or complete the word.
  // skipped=true skips celebration (used by Skip button).
  const advanceChar = (confirmedChar: string, skipped = false) => {
    setDrawnPaths([]);
    setCurrentPath('');
    setErrorPhase('none');
    setCharAttempts(0);

    const newWritten = [...writtenChars, confirmedChar];
    setWrittenChars(newWritten);

    if (charIdx + 1 < characters.length) {
      // More characters remaining in this word
      setCharIdx(charIdx + 1);
    } else {
      // Whole word done
      const wordText = currentItem.characters || currentItem.pinyin;
      setCompletedWords((prev) => [...prev, wordText]);
      setWrittenChars([]);
      setCharIdx(0);

      if (!skipped) {
        if (currentIndex + 1 < totalItems) {
          afterCelebrationRef.current = () => setCurrentIndex((prev) => prev + 1);
        } else {
          afterCelebrationRef.current = () => setPhase('complete');
        }
        setShowCelebration(true);
      } else {
        // Skip: advance directly, no celebration
        if (currentIndex + 1 < totalItems) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setPhase('complete');
        }
      }
    }
  };

  // OCR check
  const handleCheck = async () => {
    if (drawnPaths.length === 0 || checking) return;
    setChecking(true);
    setFeedback(null);

    // Try OCR — any failure is treated as unrecognized (empty string)
    let recognized = '';
    try {
      const base64 = canvasToBase64(drawnPaths, WRITING_GRID_SIZE);
      if (base64) {
        recognized = (await recognizeImage(base64)).trim();
      }
    } catch {
      // OCR failed — fall through as wrong answer
    } finally {
      setChecking(false);
    }

    if (recognized.includes(currentChar)) {
      setFeedback('correct');
      setTimeout(() => {
        setFeedback(null);
        advanceChar(currentChar);
      }, 600);
      return;
    }

    // Incorrect attempt — always increment so hint/animation thresholds are reached
    const newAttempts = charAttempts + 1;
    setCharAttempts(newAttempts);
    setLastAttemptPaths([...drawnPaths]);
    setLastRecognized(recognized);

    if (newAttempts >= 3 && !postAnimation) {
      // 3rd wrong: show stroke-by-stroke writing animation
      setDrawnPaths([]);
      setCurrentPath('');
      setErrorPhase('animation');
      setAnimStrokeIdx(0);
      if (!charData) {
        loadCharacterData(currentChar).then((d) => { if (d) setCharData(d); });
      }
    } else if (newAttempts >= 2 && !postAnimation) {
      // 2nd wrong: show hint with comparison + error-circle
      setErrorCircle(findErrorCircle(drawnPaths, charData, WRITING_GRID_SIZE));
      setDrawnPaths([]);
      setCurrentPath('');
      setErrorPhase('hint');
      if (!charData) {
        loadCharacterData(currentChar).then((d) => { if (d) setCharData(d); });
      }
    } else {
      // 1st wrong (or post-animation): brief red flash, clear, let child retry or skip
      setFeedback('incorrect');
      setTimeout(() => {
        setFeedback(null);
        setDrawnPaths([]);
        setCurrentPath('');
      }, 1200);
    }
  };

  // Skip only the current character (not the entire word/question)
  const handleSkip = () => {
    setFeedback(null);
    advanceChar(currentChar, true);
  };

  const handleDismissHint = () => {
    setErrorPhase('none');
  };

  const handleDismissAnimation = () => {
    setPostAnimation(true);
    setErrorPhase('none');
    setAnimStrokeIdx(0);
    setCharData(null);
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

  const hasStrokes = drawnPaths.length > 0;
  const canvasBorderColor =
    feedback === 'correct' ? colors.correct : feedback === 'incorrect' ? '#EF4444' : colors.border;
  const animDone = charData && animStrokeIdx >= charData.strokes.length;

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
        {/* Completed words */}
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

        {phase === 'complete' ? (
          <View style={styles.doneContainer}>
            <Text style={styles.doneEmoji}>🎉</Text>
            <Text style={styles.doneText}>All done!</Text>
            <Text style={styles.doneSubtext}>{totalItems} words completed</Text>
            <Pressable style={styles.returnBtn} onPress={() => router.back()}>
              <Text style={styles.returnBtnText}>Back to Lesson</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Word counter — always visible */}
            <View style={styles.topRow}>
              <Text style={styles.wordCounter}>第 {currentIndex + 1} / {totalItems} 题</Text>
              {characters.length > 1 && (
                <Text style={styles.charCounter}>字 {charIdx + 1}/{characters.length}</Text>
              )}
            </View>

            {/* ── HINT (2nd wrong attempt) — full-width, replaces canvas ── */}
            {errorPhase === 'hint' && (
              <View style={styles.hintSection}>
                <Text style={styles.hintTitle}>再看看！</Text>

                <View style={styles.hintCompareRow}>
                  {/* What the child drew */}
                  <View style={styles.hintPanel}>
                    <Text style={styles.hintPanelLabel}>你写的</Text>
                    <View style={styles.hintMiniCanvas}>
                      <Svg
                        width={90}
                        height={90}
                        viewBox={`0 0 ${WRITING_GRID_SIZE} ${WRITING_GRID_SIZE}`}
                      >
                        {lastAttemptPaths.map((d, i) => (
                          <Path
                            key={i}
                            d={d}
                            stroke="#3B82F6"
                            strokeWidth={10}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ))}
                        {errorCircle && (
                          <Circle
                            cx={errorCircle.cx}
                            cy={errorCircle.cy}
                            r={errorCircle.r}
                            stroke="#EF4444"
                            strokeWidth={8}
                            fill="none"
                            strokeDasharray="16 8"
                          />
                        )}
                      </Svg>
                    </View>
                  </View>

                  <Text style={styles.hintArrow}>→</Text>

                  {/* Correct character with pulsing ring */}
                  <View style={styles.hintPanel}>
                    <Text style={styles.hintPanelLabel}>正确</Text>
                    <Animated.View
                      style={[styles.hintCorrectBox, { transform: [{ scale: pulseAnim }] }]}
                    >
                      <Text style={styles.hintBigChar}>{currentChar}</Text>
                    </Animated.View>
                  </View>
                </View>

                <Text style={styles.hintExplanation}>
                  {lastRecognized
                    ? `你写的像 "${lastRecognized}"，注意 "${currentChar}" 的笔画位置和方向`
                    : `注意 "${currentChar}" 的笔画顺序和起笔位置`}
                </Text>

                <Pressable style={styles.hintRetryBtn} onPress={handleDismissHint}>
                  <Text style={styles.hintRetryText}>再试一次</Text>
                </Pressable>
              </View>
            )}

            {/* ── STROKE ANIMATION (3rd wrong attempt) — full-width, replaces canvas ── */}
            {errorPhase === 'animation' && (
              <View style={styles.animSection}>
                <Text style={styles.animTitle}>
                  {!charData
                    ? '加载中...'
                    : animDone
                      ? `"${currentChar}" 写完了！`
                      : `看老师写：第 ${animStrokeIdx + 1} / ${charData.strokes.length} 笔`}
                </Text>

                <MiziGrid size={WRITING_GRID_SIZE}>
                  <Svg
                    width={WRITING_GRID_SIZE}
                    height={WRITING_GRID_SIZE}
                    viewBox="0 0 1024 1024"
                    style={StyleSheet.absoluteFill}
                  >
                    {charData?.strokes.slice(0, animStrokeIdx).map((d, i) => (
                      <Path
                        key={`done-${i}`}
                        d={d}
                        fill={i === animStrokeIdx - 1 ? colors.primary : colors.correct}
                        opacity={i === animStrokeIdx - 1 ? 1 : 0.65}
                        transform="scale(1, -1) translate(0, -900)"
                      />
                    ))}
                    {charData?.strokes.slice(animStrokeIdx).map((d, i) => (
                      <Path
                        key={`ghost-${i}`}
                        d={d}
                        fill="#C0C0C0"
                        opacity={0.3}
                        transform="scale(1, -1) translate(0, -900)"
                      />
                    ))}
                  </Svg>
                </MiziGrid>

                {animDone && (
                  <Pressable style={styles.animTryBtn} onPress={handleDismissAnimation}>
                    <Text style={styles.animTryText}>我来写！</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* ── NORMAL CANVAS + BUTTONS ── */}
            {errorPhase === 'none' && (
              <>
                <View style={styles.writingRow}>
                  {writtenChars.length > 0 && (
                    <View style={styles.writtenCharsCol}>
                      {writtenChars.map((ch, i) => (
                        <View key={i} style={styles.writtenCharBox}>
                          <Text style={styles.writtenCharText}>{ch}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={{ position: 'relative' }}>
                    <View
                      style={[
                        styles.canvas,
                        { width: WRITING_GRID_SIZE, height: WRITING_GRID_SIZE, borderColor: canvasBorderColor },
                      ]}
                      {...panResponder.panHandlers}
                    >
                      <MiziGrid size={WRITING_GRID_SIZE} />
                      <Svg width={WRITING_GRID_SIZE} height={WRITING_GRID_SIZE} style={StyleSheet.absoluteFill}>
                        {drawnPaths.map((d, i) => (
                          <Path key={i} d={d} stroke={colors.text} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        ))}
                        {currentPath ? (
                          <Path d={currentPath} stroke={colors.text} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        ) : null}
                      </Svg>
                    </View>
                    {feedback === 'incorrect' && (
                      <View style={styles.feedbackOverlay}>
                        <Text style={styles.feedbackText}>Try again!</Text>
                      </View>
                    )}
                    {feedback === 'correct' && (
                      <View style={[styles.feedbackOverlay, styles.feedbackCorrect]}>
                        <Text style={[styles.feedbackText, { color: colors.correct }]}>✓</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  <Pressable style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.8 }]} onPress={handleRepeat}>
                    <Text style={styles.smallBtnText}>🔊</Text>
                  </Pressable>
                  <Pressable style={({ pressed }) => [styles.smallBtn, styles.clearBtn, pressed && { opacity: 0.8 }]} onPress={handleClear}>
                    <Text style={styles.smallBtnText}>🗑️</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.checkBtn, (!hasStrokes || checking) && styles.btnDisabled, pressed && { opacity: 0.8 }]}
                    onPress={handleCheck}
                    disabled={!hasStrokes || checking}
                  >
                    {checking ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.checkBtnText}>Check ✓</Text>}
                  </Pressable>
                  <Pressable style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.8 }]} onPress={handleSkip}>
                    <Text style={styles.skipBtnText}>Skip ⏭</Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
        )}
      </View>

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
  backText: { fontSize: 18, color: colors.primary, fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  body: { flex: 1, paddingHorizontal: spacing.md },
  completedList: { maxHeight: 44, marginBottom: spacing.sm },
  completedContent: { gap: 8, alignItems: 'center' },
  completedChip: {
    backgroundColor: colors.correct + '20',
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.correct + '40',
  },
  completedWord: { fontSize: 16, color: colors.correct, fontWeight: '600' },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  wordCounter: { fontSize: 20, fontWeight: '700', color: colors.text },
  charCounter: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  writingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  writtenCharsCol: { flexDirection: 'row', gap: 4, alignItems: 'center' },
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
  writtenCharText: { fontSize: 36, color: colors.text, fontWeight: '400' },

  // ── Canvas ──
  canvas: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 2,
    overflow: 'hidden',
  },
  feedbackOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: radius.md,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackCorrect: { backgroundColor: 'rgba(34,197,94,0.15)' },
  feedbackText: { fontSize: 28, fontWeight: '800', color: '#EF4444' },

  // ── Hint overlay ──
  hintSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  hintTitle: { fontSize: 22, fontWeight: '800', color: '#EF4444' },
  hintCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  hintPanel: { alignItems: 'center', gap: spacing.xs },
  hintPanelLabel: { fontSize: 13, color: colors.textLight, fontWeight: '600' },
  hintMiniCanvas: {
    width: 90,
    height: 90,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  hintArrow: { fontSize: 24, color: colors.textLight },
  hintCorrectBox: {
    width: 90,
    height: 90,
    borderRadius: radius.sm,
    borderWidth: 3,
    borderColor: '#EF4444',
    backgroundColor: '#FFF9F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintBigChar: { fontSize: 60, color: colors.text, fontWeight: '400' },
  hintExplanation: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 20,
  },
  hintRetryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
  },
  hintRetryText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // ── Animation overlay ──
  animSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  animTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
  animTryBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.correct,
    borderRadius: radius.lg,
  },
  animTryText: { fontSize: 18, fontWeight: '700', color: '#FFF' },

  // ── Buttons ──
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  smallBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: { borderColor: colors.border },
  smallBtnText: { fontSize: 18 },
  checkBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.correct,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  checkBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  skipBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.textLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: { fontSize: 14, fontWeight: '700', color: colors.textLight },
  btnDisabled: { opacity: 0.4 },

  // ── Done screen ──
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  doneEmoji: { fontSize: 64 },
  doneText: { fontSize: 28, fontWeight: '800', color: colors.correct },
  doneSubtext: { fontSize: 16, color: colors.textLight },
  returnBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  returnBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  errorText: {
    fontSize: 20,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 100,
  },
});
