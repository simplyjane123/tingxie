import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { colors } from '../../constants/theme';

interface Props {
  isCorrect: boolean | null;
  children: React.ReactNode;
}

export default function LocalCorrection({ isCorrect, children }: Props) {
  const borderColor = useSharedValue('transparent');
  const borderWidth = useSharedValue(0);

  useEffect(() => {
    if (isCorrect === null) {
      borderWidth.value = 0;
      return;
    }

    const color = isCorrect ? colors.correct : colors.incorrect;
    borderColor.value = color;
    borderWidth.value = withSequence(
      withTiming(3, { duration: 150 }),
      withTiming(3, { duration: 500 }),
      withTiming(0, { duration: 300 }),
    );
  }, [isCorrect]);

  const animStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
    borderWidth: borderWidth.value,
    borderRadius: 12,
  }));

  return (
    <Animated.View style={[styles.wrapper, animStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
});
