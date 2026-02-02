import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder, GestureResponderEvent } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import MiziGrid from './MiziGrid';
import { colors, spacing } from '../../constants/theme';
import { WRITING_GRID_SIZE } from '../../constants/layout';

interface StrokeData {
  strokes: string[];
  medians: number[][][];
}

interface Props {
  characterData: StrokeData | null;
  character: string;
  onComplete?: () => void;
}

interface DrawnStroke {
  path: string;
  correct: boolean;
}

export default function StrokeTracer({ characterData, character, onComplete }: Props) {
  const [currentStrokeIdx, setCurrentStrokeIdx] = useState(0);
  const [drawnStrokes, setDrawnStrokes] = useState<DrawnStroke[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  const totalStrokes = characterData?.strokes.length ?? 0;
  const isComplete = currentStrokeIdx >= totalStrokes;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isComplete,
      onMoveShouldSetPanResponder: () => !isComplete,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        pointsRef.current = [{ x: locationX, y: locationY }];
        setCurrentPath(`M${locationX},${locationY}`);
        setFeedback(null);
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        pointsRef.current.push({ x: locationX, y: locationY });
        setCurrentPath(prev => `${prev} L${locationX},${locationY}`);
      },
      onPanResponderRelease: () => {
        if (!characterData || pointsRef.current.length < 3) {
          setCurrentPath('');
          return;
        }

        // Simplified stroke validation: check if the drawn stroke
        // roughly follows the expected median path direction
        const drawnPoints = pointsRef.current;
        const expectedMedian = characterData.medians[currentStrokeIdx];

        if (!expectedMedian || expectedMedian.length < 2) {
          // Can't validate, accept it
          handleCorrect();
          return;
        }

        // Check general direction match
        const drawnDx = drawnPoints[drawnPoints.length - 1].x - drawnPoints[0].x;
        const drawnDy = drawnPoints[drawnPoints.length - 1].y - drawnPoints[0].y;

        const scale = WRITING_GRID_SIZE / 1024;
        const first = expectedMedian[0];
        const last = expectedMedian[expectedMedian.length - 1];
        const expectedDx = (last[0] - first[0]) * scale;
        const expectedDy = -(last[1] - first[1]) * scale; // Y is flipped in SVG coords

        // Simple direction check using dot product
        const dot = drawnDx * expectedDx + drawnDy * expectedDy;

        if (dot > 0 || (Math.abs(drawnDx) < 20 && Math.abs(drawnDy) < 20 && Math.abs(expectedDx) < 30 && Math.abs(expectedDy) < 30)) {
          handleCorrect();
        } else {
          handleIncorrect();
        }
      },
    })
  ).current;

  const handleCorrect = () => {
    setFeedback('correct');
    setDrawnStrokes(prev => [...prev, { path: currentPath, correct: true }]);
    setCurrentPath('');

    setTimeout(() => {
      const nextIdx = currentStrokeIdx + 1;
      setCurrentStrokeIdx(nextIdx);
      setFeedback(null);
      if (nextIdx >= totalStrokes) {
        onComplete?.();
      }
    }, 400);
  };

  const handleIncorrect = () => {
    setFeedback('incorrect');
    setTimeout(() => {
      setCurrentPath('');
      setFeedback(null);
    }, 600);
  };

  if (!characterData) {
    return (
      <MiziGrid>
        <View style={styles.charOverlay}>
          <Text style={styles.fallbackChar}>{character}</Text>
        </View>
      </MiziGrid>
    );
  }

  // Show start point for current stroke
  const currentMedian = characterData.medians[currentStrokeIdx];
  const scale = WRITING_GRID_SIZE / 1024;
  const startPoint = currentMedian
    ? { x: currentMedian[0][0] * scale, y: WRITING_GRID_SIZE - currentMedian[0][1] * scale }
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>
        笔画 {Math.min(currentStrokeIdx + 1, totalStrokes)} / {totalStrokes}
      </Text>

      <MiziGrid>
        <View {...panResponder.panHandlers} style={StyleSheet.absoluteFill}>
          <Svg width={WRITING_GRID_SIZE} height={WRITING_GRID_SIZE} style={StyleSheet.absoluteFill}>
            {/* Ghost character */}
            {characterData.strokes.map((d, i) => (
              <Path
                key={`ghost-${i}`}
                d={d}
                fill={i < currentStrokeIdx ? colors.correct : '#E8E8E8'}
                opacity={i < currentStrokeIdx ? 0.6 : 0.15}
                transform={`scale(${scale}, ${-scale}) translate(0, ${-1024 + 124 / scale})`}
              />
            ))}

            {/* Current stroke highlight */}
            {!isComplete && currentStrokeIdx < characterData.strokes.length && (
              <Path
                d={characterData.strokes[currentStrokeIdx]}
                fill={colors.primary}
                opacity={0.2}
                transform={`scale(${scale}, ${-scale}) translate(0, ${-1024 + 124 / scale})`}
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

      {isComplete && (
        <Text style={styles.doneText}>写完了!</Text>
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
  doneText: {
    fontSize: 24,
    color: colors.correct,
    fontWeight: '700',
  },
});
