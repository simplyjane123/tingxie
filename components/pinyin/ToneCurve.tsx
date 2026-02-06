import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { toneColor } from '../../constants/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  tone: 1 | 2 | 3 | 4;
  size?: number;
  animate?: boolean;
  replayKey?: number; // Change this to replay the animation
}

// SVG paths for the 4 tone contour shapes (centered in 0-100 viewBox)
const TONE_PATHS: Record<number, string> = {
  1: 'M5,25 L95,25',                     // flat high —
  2: 'M5,45 Q50,5 95,20',                // rising /
  3: 'M5,30 Q35,55 50,50 Q65,45 95,25',  // dipping \/
  4: 'M5,15 Q50,50 95,50',               // falling \
};

export default function ToneCurve({ tone, size = 100, animate = true, replayKey = 0 }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: animate ? 600 : 0 });
  }, [tone, replayKey]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 1], [200, 0]),
  }));

  const height = size * 0.5;

  return (
    <View style={[styles.container, { width: size, height }]}>
      <Svg width={size} height={height} viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet">
        <AnimatedPath
          d={TONE_PATHS[tone]}
          stroke={toneColor(tone)}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={200}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
