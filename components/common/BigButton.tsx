import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, radius, typography } from '../../constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export default function BigButton({ label, onPress, color = colors.primary, style, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: disabled ? colors.textMuted : color, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  label: {
    color: '#FFFFFF',
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
  },
});
