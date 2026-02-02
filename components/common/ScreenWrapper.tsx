import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function ScreenWrapper({ children, style }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.safe,
        {
          paddingTop: Platform.OS === 'web' ? spacing.md : insets.top,
          paddingBottom: Platform.OS === 'web' ? spacing.md : insets.bottom,
        },
      ]}
    >
      <View style={[styles.container, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
});
