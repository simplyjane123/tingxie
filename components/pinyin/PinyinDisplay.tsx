import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Syllable } from '../../types';
import { toneColor, colors, spacing, typography } from '../../constants/theme';
import ToneCurve from './ToneCurve';

interface Props {
  syllables: Syllable[];
  highlightIndex?: number;
  showToneColor?: boolean;
  showToneCurve?: boolean;
  size?: 'normal' | 'large' | 'xlarge';
  replayKey?: number;
}

export default function PinyinDisplay({ syllables, highlightIndex, showToneColor = true, showToneCurve = false, size = 'large', replayKey = 0 }: Props) {
  const fontSize = size === 'xlarge' ? 56 : size === 'large' ? typography.pinyin.fontSize : 32;
  const curveWidth = fontSize * 1.5;

  return (
    <View style={styles.container}>
      {syllables.map((syl, i) => (
        <View key={i} style={styles.syllableWrapper}>
          {showToneCurve && syl.tone >= 1 && syl.tone <= 4 && (
            <ToneCurve tone={syl.tone as 1|2|3|4} size={curveWidth} replayKey={replayKey} />
          )}
          <Text
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
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  syllableWrapper: {
    alignItems: 'center',
  },
  syllable: {
    fontWeight: '700',
  },
});
