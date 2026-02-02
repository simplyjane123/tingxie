import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../constants/theme';

interface Props {
  total: number;
  current: number;
  completedColor?: string;
}

export default function ProgressDots({ total, current, completedColor = colors.correct }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < current
              ? { backgroundColor: completedColor }
              : i === current
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
