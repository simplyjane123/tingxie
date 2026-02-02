import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { toneColor, colors, spacing, radius } from '../../constants/theme';
import { stripTone, applyTone } from '../../utils/pinyin';

interface Props {
  onSelect: (tone: 1 | 2 | 3 | 4) => void;
  selectedTone?: number | null;
  correctTone?: number | null;
  disabled?: boolean;
  syllable?: string; // e.g. "pà" — will show pā pá pǎ pà instead of ā á ǎ à
}

const TONE_NAMES = ['第一声', '第二声', '第三声', '第四声'] as const;

export default function ToneSelector({ onSelect, selectedTone, correctTone, disabled, syllable }: Props) {
  const bare = syllable ? stripTone(syllable) : '';

  const toneLabels = ([1, 2, 3, 4] as const).map((tone) => ({
    tone,
    label: bare ? applyTone(bare, tone) : applyTone('a', tone),
    name: TONE_NAMES[tone - 1],
  }));

  return (
    <View style={styles.container}>
      {toneLabels.map(({ tone, label, name }) => {
        const isSelected = selectedTone === tone;
        const isCorrect = correctTone === tone;
        const isWrong = isSelected && correctTone !== null && correctTone !== tone;

        let bgColor = colors.surface;
        if (isCorrect && correctTone !== null) bgColor = colors.correct;
        else if (isWrong) bgColor = colors.incorrect;
        else if (isSelected) bgColor = toneColor(tone);

        return (
          <Pressable
            key={tone}
            onPress={() => !disabled && onSelect(tone)}
            style={[
              styles.option,
              {
                backgroundColor: bgColor,
                borderColor: toneColor(tone),
              },
            ]}
          >
            <Text style={[
              styles.label,
              { color: isSelected || isCorrect || isWrong ? '#FFFFFF' : toneColor(tone) },
            ]}>
              {label}
            </Text>
            <Text style={[
              styles.name,
              { color: isSelected || isCorrect || isWrong ? '#FFFFFF' : colors.textLight },
            ]}>
              {name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  option: {
    minWidth: 72,
    height: 90,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  label: {
    fontSize: 28,
    fontWeight: '700',
  },
  name: {
    fontSize: 11,
    fontWeight: '500',
  },
});
