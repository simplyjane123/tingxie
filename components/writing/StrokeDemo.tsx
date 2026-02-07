import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { speakChinese } from '../../utils/speech';
import MiziGrid from './MiziGrid';
import { colors, spacing } from '../../constants/theme';
import { WRITING_GRID_SIZE } from '../../constants/layout';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface StrokeData {
  strokes: string[];
  medians: number[][][];
}

interface Props {
  characterData: StrokeData | null;
  character: string;
  speakText?: string;
  onComplete?: () => void;
}

export default function StrokeDemo({ characterData, character, speakText, onComplete }: Props) {
  const [currentStroke, setCurrentStroke] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  const speak = useCallback(() => {
    const textToSpeak = speakText || character;
    speakChinese(textToSpeak);
  }, [speakText, character]);

  const play = useCallback(() => {
    if (!characterData) return;
    setIsPlaying(true);
    setCurrentStroke(0);
    speak();
  }, [characterData, speak]);

  useEffect(() => {
    if (!characterData || currentStroke < 0) return;

    if (currentStroke >= characterData.strokes.length) {
      setIsPlaying(false);
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStroke(prev => prev + 1);
    }, 600);

    return () => clearTimeout(timer);
  }, [currentStroke, characterData]);

  useEffect(() => {
    // Auto-play on mount
    const t = setTimeout(play, 500);
    return () => clearTimeout(t);
  }, []);

  if (!characterData) {
    return (
      <MiziGrid>
        <View style={styles.charOverlay}>
          <Text style={styles.fallbackChar}>{character}</Text>
        </View>
      </MiziGrid>
    );
  }

  const scale = WRITING_GRID_SIZE / 1024;

  return (
    <View style={styles.container}>
      <Pressable onPress={play} style={styles.replayBtn}>
        <Text style={styles.replayText}>
          {isPlaying ? '播放中...' : '重播'}
        </Text>
      </Pressable>

      <MiziGrid>
        <Svg
          width={WRITING_GRID_SIZE}
          height={WRITING_GRID_SIZE}
          viewBox="0 0 1024 1024"
          style={StyleSheet.absoluteFill}
        >
          {characterData.strokes.map((d, i) => (
            <Path
              key={i}
              d={d}
              fill={i < currentStroke ? colors.text : i === currentStroke ? colors.primary : '#E0E0E0'}
              opacity={i <= currentStroke ? 1 : 0.2}
              transform="scale(1, -1) translate(0, -900)"
            />
          ))}
        </Svg>
      </MiziGrid>
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
  replayBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  replayText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
