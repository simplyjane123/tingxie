import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { colors } from '../../constants/theme';
import { WRITING_GRID_SIZE } from '../../constants/layout';

interface Props {
  size?: number;
  children?: React.ReactNode;
}

export default function MiziGrid({ size = WRITING_GRID_SIZE, children }: Props) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Outer border */}
        <Rect x={1} y={1} width={size - 2} height={size - 2} stroke={colors.border} strokeWidth={2} fill="none" />
        {/* Vertical center line (dashed) */}
        <Line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke={colors.border} strokeWidth={1} strokeDasharray="8,6" />
        {/* Horizontal center line (dashed) */}
        <Line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke={colors.border} strokeWidth={1} strokeDasharray="8,6" />
        {/* Diagonal lines (dashed) */}
        <Line x1={0} y1={0} x2={size} y2={size} stroke={colors.border} strokeWidth={0.5} strokeDasharray="8,6" opacity={0.5} />
        <Line x1={size} y1={0} x2={0} y2={size} stroke={colors.border} strokeWidth={0.5} strokeDasharray="8,6" opacity={0.5} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
});
