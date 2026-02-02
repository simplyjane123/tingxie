import React, { useEffect } from 'react';
import { StyleSheet, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onDone?: () => void;
}

const EMOJIS = ['⭐', '🌟', '✨', '🎉', '👏', '💪'];

export default function CelebrationRoll({ visible, onDone }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      opacity.value = 0;
      scale.value = 0;
      return;
    }

    // Pick random entry direction
    const dir = Math.floor(Math.random() * 4);
    switch (dir) {
      case 0: // from top
        translateX.value = 0;
        translateY.value = -SCREEN_H / 2;
        break;
      case 1: // from bottom
        translateX.value = 0;
        translateY.value = SCREEN_H / 2;
        break;
      case 2: // from left
        translateX.value = -SCREEN_W / 2;
        translateY.value = 0;
        break;
      case 3: // from right
        translateX.value = SCREEN_W / 2;
        translateY.value = 0;
        break;
    }

    opacity.value = 1;
    scale.value = 0.3;

    translateX.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.5)) });
    translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.5)) });
    scale.value = withSequence(
      withTiming(1.2, { duration: 350 }),
      withTiming(1, { duration: 150 }),
    );

    // Auto-hide after 800ms
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 200 }, () => {
        if (onDone) runOnJS(onDone)();
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

  return (
    <Animated.View style={[styles.container, animStyle]} pointerEvents="none">
      <Text style={styles.emoji}>{emoji}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  emoji: {
    fontSize: 96,
  },
});
