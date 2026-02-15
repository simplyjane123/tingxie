import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder, GestureResponderEvent, Pressable } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { speakChinese } from '../../utils/speech';
import MiziGrid from './MiziGrid';
import { colors, spacing } from '../../constants/theme';
import { WRITING_GRID_SIZE } from '../../constants/layout';

const ANIMALS = ['🦫', '🐼', '🐰', '🦩', '🐱', '🐶', '🦊', '🐻', '🐨', '🦁', '🐯', '🐸', '🐧', '🦄', '🐷', '🐮'];

interface StrokeData {
  strokes: string[];
  medians: number[][][];
}

interface Props {
  characterData: StrokeData | null;
  character: string;
  wordLabel?: string;
  speakText?: string;
  onComplete?: () => void;
}

interface DrawnStroke {
  path: string;
  correct: boolean;
}

export default function StrokeTracer({ characterData, character, wordLabel, speakText, onComplete }: Props) {
  const [currentStrokeIdx, setCurrentStrokeIdx] = useState(0);
  const [drawnStrokes, setDrawnStrokes] = useState<DrawnStroke[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const strokeIdxRef = useRef(0);
  const charDataRef = useRef(characterData);

  const totalStrokes = characterData?.strokes.length ?? 0;
  const isComplete = currentStrokeIdx >= totalStrokes;


  // Reset function for repeat button
  const handleRepeat = () => {
    setCurrentStrokeIdx(0);
    setDrawnStrokes([]);
    setCurrentPath('');
    setFeedback(null);
    setShowCelebration(false);
    strokeIdxRef.current = 0;
  };

  // Scale factor to convert screen coordinates to viewBox coordinates
  const screenToViewBox = 1024 / WRITING_GRID_SIZE;

  // Keep refs in sync with state
  strokeIdxRef.current = currentStrokeIdx;
  charDataRef.current = characterData;

  const handleCorrect = () => {
    setFeedback('correct');
    const pathStr = pointsRef.current.map((p, i) => {
      const vx = p.x * screenToViewBox;
      const vy = p.y * screenToViewBox;
      return i === 0 ? `M${vx},${vy}` : `L${vx},${vy}`;
    }).join(' ');
    setDrawnStrokes(prev => [...prev, { path: pathStr, correct: true }]);
    setCurrentPath('');

    setTimeout(() => {
      const nextIdx = strokeIdxRef.current + 1;
      setCurrentStrokeIdx(nextIdx);
      setFeedback(null);
      if (nextIdx >= totalStrokes) {
        // Play speech first, then show celebration
        if (speakText) {
          speakChinese(speakText);
        }
        setTimeout(() => {
          setShowCelebration(true);
          setTimeout(() => {
            onComplete?.();
          }, 2000);
        }, 800); // Delay celebration to let speech start
      }
    }, 300);
  };

  const handleIncorrect = () => {
    setFeedback('incorrect');
    setTimeout(() => {
      setCurrentPath('');
      setFeedback(null);
    }, 400);
  };

  const validateStroke = () => {
    const data = charDataRef.current;
    if (!data || pointsRef.current.length < 2) {
      setCurrentPath('');
      return;
    }

    const drawnPoints = pointsRef.current;
    const expectedMedian = data.medians[strokeIdxRef.current];

    // If no median data, accept any stroke
    if (!expectedMedian || expectedMedian.length < 2) {
      handleCorrect();
      return;
    }

    const scale = WRITING_GRID_SIZE / 1024;

    // Check start position: drawn stroke must start near expected start point
    const expectedStartX = expectedMedian[0][0] * scale;
    const expectedStartY = (900 - expectedMedian[0][1]) * scale;
    const startDist = Math.sqrt(
      (drawnPoints[0].x - expectedStartX) ** 2 +
      (drawnPoints[0].y - expectedStartY) ** 2
    );

    // Reject if start position is too far (>30% of grid size)
    const positionThreshold = WRITING_GRID_SIZE * 0.30;
    if (startDist > positionThreshold) {
      handleIncorrect();
      return;
    }

    // Calculate drawn stroke direction
    const drawnDx = drawnPoints[drawnPoints.length - 1].x - drawnPoints[0].x;
    const drawnDy = drawnPoints[drawnPoints.length - 1].y - drawnPoints[0].y;
    const drawnLen = Math.sqrt(drawnDx * drawnDx + drawnDy * drawnDy);

    // Calculate expected stroke direction
    const first = expectedMedian[0];
    const last = expectedMedian[expectedMedian.length - 1];
    const expectedDx = (last[0] - first[0]) * scale;
    const expectedDy = -(last[1] - first[1]) * scale; // Y is flipped
    const expectedLen = Math.sqrt(expectedDx * expectedDx + expectedDy * expectedDy);

    // For very short strokes (dots), accept if start position is close enough
    if (expectedLen < 20 || drawnLen < 15) {
      handleCorrect();
      return;
    }

    // Check direction using dot product (normalized)
    const dot = (drawnDx * expectedDx + drawnDy * expectedDy) / (drawnLen * expectedLen + 0.001);

    // Accept if direction is roughly correct (dot > 0.3 means < ~72 degrees off)
    if (dot > 0.3) {
      handleCorrect();
    } else {
      handleIncorrect();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        pointsRef.current = [{ x: locationX, y: locationY }];
        // Scale to viewBox coordinates
        const vx = locationX * screenToViewBox;
        const vy = locationY * screenToViewBox;
        setCurrentPath(`M${vx},${vy}`);
        setFeedback(null);
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        pointsRef.current.push({ x: locationX, y: locationY });
        // Scale to viewBox coordinates
        const vx = locationX * screenToViewBox;
        const vy = locationY * screenToViewBox;
        setCurrentPath(prev => `${prev} L${vx},${vy}`);
      },
      onPanResponderRelease: () => {
        validateStroke();
      },
    })
  ).current;

  if (!characterData) {
    return (
      <MiziGrid>
        <View style={styles.charOverlay}>
          <Text style={styles.fallbackChar}>{character}</Text>
        </View>
      </MiziGrid>
    );
  }

  // Show start point for current stroke (in viewBox 0-1024 coordinates)
  const currentMedian = characterData.medians[currentStrokeIdx];
  const startPoint = currentMedian
    ? { x: currentMedian[0][0], y: 900 - currentMedian[0][1] }
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>
        笔画 {Math.min(currentStrokeIdx + 1, totalStrokes)} / {totalStrokes}
      </Text>

      <MiziGrid>
        <View {...panResponder.panHandlers} style={StyleSheet.absoluteFill}>
          <Svg width={WRITING_GRID_SIZE} height={WRITING_GRID_SIZE} viewBox="0 0 1024 1024" style={StyleSheet.absoluteFill}>
            {/* Ghost character */}
            {characterData.strokes.map((d, i) => (
              <Path
                key={`ghost-${i}`}
                d={d}
                fill={i < currentStrokeIdx ? colors.correct : '#E8E8E8'}
                opacity={i < currentStrokeIdx ? 0.6 : 0.15}
                transform="scale(1, -1) translate(0, -900)"
              />
            ))}

            {/* Current stroke highlight */}
            {!isComplete && currentStrokeIdx < characterData.strokes.length && (
              <Path
                d={characterData.strokes[currentStrokeIdx]}
                fill={colors.primary}
                opacity={0.2}
                transform="scale(1, -1) translate(0, -900)"
              />
            )}

            {/* Start point indicator */}
            {startPoint && !isComplete && (
              <Circle
                cx={startPoint.x}
                cy={startPoint.y}
                r={8}
                fill={colors.primary}
                opacity={0.7}
              />
            )}

            {/* Drawn strokes */}
            {drawnStrokes.map((s, i) => (
              <Path
                key={`drawn-${i}`}
                d={s.path}
                stroke={colors.correct}
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.5}
              />
            ))}

            {/* Current drawing */}
            {currentPath ? (
              <Path
                d={currentPath}
                stroke={feedback === 'incorrect' ? colors.incorrect : feedback === 'correct' ? colors.correct : colors.text}
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </Svg>
        </View>
      </MiziGrid>

      {wordLabel && (
        <Text style={styles.wordLabel}>{wordLabel}</Text>
      )}

      {isComplete && !showCelebration && (
        <View style={styles.completeRow}>
          <Text style={styles.doneText}>写完了!</Text>
          <Pressable onPress={handleRepeat} style={styles.repeatBtn}>
            <Text style={styles.repeatText}>重复</Text>
          </Pressable>
        </View>
      )}

      {/* Celebration overlay with animals */}
      {showCelebration && (
        <View style={styles.celebrationOverlay}>
          <View style={styles.animalRow}>
            {[...ANIMALS].sort(() => Math.random() - 0.5).slice(0, 6).map((animal, i) => (
              <Text key={i} style={styles.animal}>{animal}</Text>
            ))}
          </View>
          <Text style={styles.celebrationText}>太棒了!</Text>
          <Pressable onPress={handleRepeat} style={styles.repeatBtnLarge}>
            <Text style={styles.repeatTextLarge}>再写一次</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
  },
  charOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackChar: {
    fontSize: 180,
    color: colors.text,
  },
  progress: {
    fontSize: 18,
    color: colors.textLight,
    fontWeight: '500',
  },
  wordLabel: {
    fontSize: 22,
    color: colors.textLight,
    fontWeight: '500',
  },
  doneText: {
    fontSize: 24,
    color: colors.correct,
    fontWeight: '700',
  },
  completeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  repeatBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  repeatText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    gap: spacing.lg,
  },
  animalRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  animal: {
    fontSize: 64,
  },
  celebrationText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  repeatBtnLarge: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: spacing.md,
  },
  repeatTextLarge: {
    color: '#4CAF50',
    fontSize: 24,
    fontWeight: '700',
  },
});
