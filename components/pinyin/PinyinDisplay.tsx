import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Syllable } from '../../types';
import { toneColor, colors, spacing, typography } from '../../constants/theme';

interface Props {
  syllables: Syllable[];
  highlightIndex?: number;
  showToneColor?: boolean;
  size?: 'normal' | 'large';
}

export default function PinyinDisplay({ syllables, highlightIndex, showToneColor = true, size = 'large' }: Props) {
  const fontSize = size === 'large' ? typography.pinyin.fontSize : 32;

  return (
    <View style={styles.container}>
      {syllables.map((syl, i) => (
        <Text
          key={i}
          style={[
            styles.syllable,
            {
              fontSize,
              color: showToneColor ? toneColor(syl.tone) : colors.text,
              opacity: highlightIndex !== undefined && highlightIndex !== i ? 0.3 : 1,
            },
          ]}
        >
          {syl.pinyin}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  syllable: {
    fontWeight: '700',
  },
});
