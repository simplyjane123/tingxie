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
}

// SVG paths for the 4 tone contour shapes
const TONE_PATHS: Record<number, string> = {
  1: 'M10,20 L90,20',                    // flat high
  2: 'M10,50 Q50,10 90,15',              // rising
  3: 'M10,25 Q30,55 50,50 Q70,45 90,30', // dipping
  4: 'M10,15 Q50,50 90,55',              // falling
};

export default function ToneCurve({ tone, size = 100, animate = true }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: animate ? 600 : 0 });
  }, [tone]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 1], [200, 0]),
  }));

  return (
    <View style={[styles.container, { width: size, height: size * 0.7 }]}>
      <Svg width={size} height={size * 0.7} viewBox="0 0 100 70">
        <AnimatedPath
          d={TONE_PATHS[tone]}
          stroke={toneColor(tone)}
          strokeWidth={4}
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
